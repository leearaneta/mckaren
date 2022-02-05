import os
import re
import asyncio
import aiohttp
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

def flatten(l):
    return [item for sublist in l for item in sublist]

def parse_times_for_court(court_div):
    court = court_div.find('div', {"class": "trainer-label"}).get_text().replace(' ', '')[-1]
    if (int(court) == 1):
        return []
    time_divs = court_div.find_all('span', {"class": "appointment button"})
    times = [div.get_text().replace(' ', '') for div in time_divs]
    return [{"court": int(court), "time": time} for time in times if ((':00' in time or ':30' in time))]

def parse_court_times_for_session(html):
    court_divs = BeautifulSoup(html).find_all('div', {"class": "healcode-trainer"})
    return flatten([parse_times_for_court(court_div) for court_div in court_divs])

sem = asyncio.Semaphore(3)

async def fetch(url, session, attempt_number=1):
    regexp = r'(?<=":")(.*)(?=\\n")'
    try:
        async with session.get(url=url) as response:
            async with sem:
                response_text = await response.text()
                return re.search(regexp, response_text).group(0).encode('utf-8').decode('unicode-escape')
    except Exception as e:
        if attempt_number >= 3:
            print("unable to fetch {}".format(url))
            return []
        else:
            print("retrying {}".format(url))
            return await fetch(url, session, attempt_number+1)

async def get_court_times_for_date(date, session):
    formatted_date = date.strftime('%Y-%m-%d')
    session_ids = [35, 25, 29] if date.weekday() in [5, 6] else [14, 5, 18, 1128]
    base_url = 'https://widgets.mindbodyonline.com/widgets/appointments/8f25324d818/results.json?callback=%3F&callback=jQuery18108096050440047702_1638908795555&utf8=%E2%9C%93&options%5Bsession_type_ids%5D={session_id}&options%5Bstaff_ids%5D%5B%5D=&options%5Bstart_date%5D={date}&options%5Bend_date%5D={date}'
    urls = [base_url.format(date=formatted_date, session_id=session_id) for session_id in session_ids]
    responses = await asyncio.gather(*[fetch(url, session) for url in urls])
    court_times = flatten([parse_court_times_for_session(html) for html in responses if html])

    def format_court_time(court_time):
        court = court_time["court"]
        dt_string = formatted_date + ' ' + court_time["time"]
        dt = datetime.strptime(dt_string, '%Y-%m-%d %I:%M%p')
        return {"court": court, "datetime": dt}

    return [format_court_time(court_time) for court_time in court_times]
    
async def get_all_court_times():
    start = datetime.today()
    end = datetime.strptime('2022-04-28', '%Y-%m-%d')
    dates = [start + timedelta(days=x) for x in range((end - start).days)]
    async with aiohttp.ClientSession() as session:
        all_court_times = flatten(await asyncio.gather(*[get_court_times_for_date(date, session) for date in dates]))
        return all_court_times

def insert_new_court_times(all_court_times, cursor):
    ts_format = "%Y-%m-%d %H:%M"
    values = [f"({court_time['court']}, '{court_time['datetime'].strftime(ts_format)}')" for court_time in all_court_times]
    insert = f"""
        CREATE TEMPORARY TABLE court_times (court SMALLINT, datetime TIMESTAMP);
        INSERT INTO court_times VALUES {','.join(values)};
    """
    cursor.execute(insert)
    new_openings = """
        CREATE TEMPORARY TABLE interval_start AS
            SELECT generate_series(date_trunc('hour', now())::timestamp, '2022-04-29 00:00'::timestamp, '30m') as datetime;
        CREATE TEMPORARY TABLE new_openings AS
            SELECT interval_start.datetime, court, 2 as length
            FROM interval_start
            INNER JOIN court_times
            ON court_times.datetime >= interval_start.datetime
            AND court_times.datetime < interval_start.datetime + interval '2h'
            AND EXTRACT(MINUTE FROM court_times.datetime) = EXTRACT(MINUTE FROM interval_start.datetime)
            GROUP BY interval_start.datetime, court
            HAVING COUNT(DISTINCT court_times.datetime) = 2
            UNION
            SELECT interval_start.datetime, court, 3 as length
            FROM interval_start
            INNER JOIN court_times
            ON court_times.datetime >= interval_start.datetime
            AND court_times.datetime < interval_start.datetime + interval '3h'
            AND EXTRACT(MINUTE FROM court_times.datetime) = EXTRACT(MINUTE FROM interval_start.datetime)
            GROUP BY interval_start.datetime, court
            HAVING COUNT(DISTINCT court_times.datetime) = 3
            UNION
            SELECT datetime, court, 1 as length
            FROM court_times;
    """
    cursor.execute(new_openings)

def get_opening_diff(cursor):
    compare = """
        SELECT * FROM new_openings
        EXCEPT
        SELECT * FROM openings
    """
    cursor.execute(compare)
    return cursor.fetchall()

def transfer_openings(cursor):
    transfer = """
        TRUNCATE openings;
        INSERT INTO openings
            SELECT * from new_openings;
    """
    cursor.execute(transfer)

async def etl():
    all_court_times = await get_all_court_times()
    conn_str = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(conn_str)
    with conn:
        with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cursor:
            insert_new_court_times(all_court_times, cursor)
            opening_diff = get_opening_diff(cursor)
            transfer_openings(cursor)
    conn.commit()
    conn.close()
    print('done!')
    return opening_diff