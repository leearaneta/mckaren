import os
import re
import asyncio
import aiohttp
import psycopg2
import psycopg2.extras
import yagmail
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from urllib.parse import urlencode, parse_qsl, quote
from cryptography.fernet import Fernet
from apscheduler.schedulers.asyncio import AsyncIOScheduler


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
            try:
                print(response_text)
            except:
                print(e)
            return []
        else:
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
    end = datetime.strptime(os.environ.get('END_DATE'), '%Y-%m-%d')
    dates = [start + timedelta(days=x) for x in range((end - start).days)]
    async with aiohttp.ClientSession() as session:
        all_court_times = flatten(await asyncio.gather(*[get_court_times_for_date(date, session) for date in dates]))
        return all_court_times

def get_openings(cursor, all_court_times):
    ts_format = "%Y-%m-%d %H:%M"
    def get_formatted_value(court_time):
        return f"({court_time['court']}, '{court_time['datetime'].strftime(ts_format)}')"

    values = [get_formatted_value(court_time) for court_time in all_court_times]
    insert = f"""
        CREATE TEMPORARY TABLE court_times (court SMALLINT, datetime TIMESTAMP);
        INSERT INTO court_times VALUES {','.join(values)};
    """
    cursor.execute(insert)
    openings = f"""
        CREATE TEMPORARY TABLE interval_start AS
            SELECT generate_series(date_trunc('hour', now())::TIMESTAMP, '{os.environ.get('END_DATE')} 00:00'::TIMESTAMP, '30m') as datetime;
        SELECT interval_start.datetime, court, 2 as hour_length
        FROM interval_start
        INNER JOIN court_times
        ON court_times.datetime >= interval_start.datetime
        AND court_times.datetime < interval_start.datetime + interval '2h'
        AND EXTRACT(MINUTE FROM court_times.datetime) = EXTRACT(MINUTE FROM interval_start.datetime)
        GROUP BY interval_start.datetime, court
        HAVING COUNT(DISTINCT court_times.datetime) = 2
        UNION
        SELECT interval_start.datetime, court, 3 as hour_length
        FROM interval_start
        INNER JOIN court_times
        ON court_times.datetime >= interval_start.datetime
        AND court_times.datetime < interval_start.datetime + interval '3h'
        AND EXTRACT(MINUTE FROM court_times.datetime) = EXTRACT(MINUTE FROM interval_start.datetime)
        GROUP BY interval_start.datetime, court
        HAVING COUNT(DISTINCT court_times.datetime) = 3
        UNION
        SELECT datetime, court, 1 as hour_length
        FROM court_times;
    """
    cursor.execute(openings)
    return cursor.fetchall()

weekend_session_id_mapping = {
    8: { 1: 35, 2: 36, 3: 37 },
    19: { 1: 25, 2: 26, 3: 27 },
    24: { 1: 29, 2: 30, 3: 32 }
}
weekday_session_id_mapping = {
    14: { 1: 14, 2: 15, 3: 16 },
    18: { 1: 5, 2: 7, 3: 8 },
    22: { 1: 18, 2: 19, 3: 20 },
    24: { 1: 1128, 2: 1130 },
}

def get_urls_from_opening(opening):
    is_weekend = opening['datetime'].weekday() in [5, 6]
    session_id_mapping = weekend_session_id_mapping if is_weekend else weekday_session_id_mapping
    sessions = sorted(session_id_mapping.keys())
    
    def get_hours_spent_per_session(hour, length, hours_spent_per_session = {}):
        session = [s for s in sessions if hour < s][0]
        hours_spent_per_session.setdefault(session, 0)
        hours_spent_per_session[session] += 1
        if length == 1:
            return hours_spent_per_session
        else:
            return get_hours_spent_per_session(hour + 1, length - 1, hours_spent_per_session)
    
    hours_spent_per_session = sorted(get_hours_spent_per_session(opening['datetime'].hour, opening['hour_length']).items())
    
    def get_url_from_session_length(session_length, idx):
        session, length = session_length
        session_id = session_id_mapping[session][length]
        booking_datetime = opening['datetime']
        if idx > 0:
            hour_offset = hours_spent_per_session[0][1]
            booking_datetime = opening['datetime'] + timedelta(hours = hour_offset)
        iso_string = booking_datetime.isoformat().split('.')[0]
        date_string = booking_datetime.strftime('%a %b %d %I:%M %p')
        court = opening['court']
        query_string = f"item[info]={date_string}&item[mbo_location_id]=1&item[name]={length} Hour Rental with Tennis Court #{court}&item[session_type_id]={session_id}&item[staff_id]={court+3}&item[start_date_time]={iso_string}+00:00&item[type]=Appointment&source=appointment_v0"
        base_url = 'https://cart.mindbodyonline.com/sites/19060/cart/add_booking?'
        return f"{base_url}{urlencode(parse_qsl(query_string))}"
    
    return [get_url_from_session_length(session_length, idx) for idx, session_length in enumerate(hours_spent_per_session)]

def insert_openings(cursor, openings):
    ts_format = "%Y-%m-%d %H:%M"
    def get_formatted_value(opening):
        start_hour = opening['datetime'].hour + (opening['datetime'].minute / 60)
        end_hour = start_hour + opening['hour_length']
        weekday = opening['datetime'].weekday() + 1 # convert to postgres format
        dt = f'{opening["datetime"].strftime(ts_format)}'
        urls = get_urls_from_opening(opening)
        return f"({opening['court']}, '{dt}', {weekday}, {opening['hour_length']}, {start_hour}, {end_hour}, ARRAY{urls})"

    values = [get_formatted_value(opening) for opening in openings]
    insert = f"""
        CREATE TEMPORARY TABLE current_openings (court SMALLINT, datetime TEXT, weekday SMALLINT, hour_length SMALLINT, start_hour FLOAT, end_hour FLOAT, urls TEXT[]);
        INSERT INTO current_openings VALUES {','.join(values)};
    """
    cursor.execute(insert)

def get_subscribed_openings(cursor):
    cursor.execute('SELECT * FROM current_openings EXCEPT SELECT * FROM openings')
    new_openings = cursor.fetchall()
    if len(new_openings) > 0:
        print(len(new_openings), 'new openings!')
    subscribed_openings = """
        SELECT datetime::TIMESTAMP, hour_length, court, urls, email
        FROM (SELECT * FROM current_openings EXCEPT SELECT * FROM openings) as new_openings
        INNER JOIN subscriptions
        USING (hour_length)
        WHERE datetime::TIMESTAMP <= NOW() + interval '1 week'
        AND start_hour >= min_start_hour
        AND end_hour <= max_end_hour
        AND weekday = ANY(weekdays)
    """
    cursor.execute(subscribed_openings)
    return cursor.fetchall()

def group_subscribed_openings_by_email(openings):
    openings_by_email = {}
    for opening in openings:
        email = opening['email']
        openings_by_email.setdefault(email, [])
        openings_by_email[email].append(opening)
    for openings in openings_by_email.values():
        openings.sort(key=lambda opening: (opening['datetime'].timestamp(), opening['court']))
    return openings_by_email

def get_opening_html(opening):
    dt = opening['datetime']
    date = dt.strftime('%a %b %d')
    start_time = dt.strftime('%I:%M%p') 
    end_time = (dt + timedelta(hours=opening['hour_length'])).strftime('%I:%M%p')
    opening_details = f"{date}, {start_time} - {end_time} on Court {opening['court']}"
    opening_details_html = f"<div style='display:inline-block;'> {opening_details} </div>"

    booking_details_html = f"<a href='{opening['urls'][0]}'>book here</a>"
    if len(opening['urls']) == 2:
        booking_details_html += f" and <a href='{opening['urls'][1]}'>here</a>"
    
    return f"<div> {opening_details_html} => {booking_details_html} </div>"

def get_email_html(email, openings):
    encryption_key = os.environ.get('EMAIL_ENCRYPTION_KEY')
    encrypted_email = Fernet(encryption_key).encrypt(email.encode()).decode()
    unsubscribe_url = "https://mckaren.herokuapp.com/unsubscribe/" + encrypted_email
    body_html = '\n'.join([get_opening_html(opening) for opening in openings])
    return f"""
        {body_html}
        <div style="margin-top: 24px;"> xoxo </div>
        <div style="margin-top: 12px;"><a href="{unsubscribe_url}"> unsubscribe </a></div>"""

yag = yagmail.SMTP('mckarentennis', os.environ.get('EMAIL_APP_PASSWORD'))

def send_emails(cursor):
    subscribed_openings = get_subscribed_openings(cursor)
    subscribed_openings_by_email = group_subscribed_openings_by_email(subscribed_openings)
    for email, openings in subscribed_openings_by_email.items():
        email_html = get_email_html(email, openings)
        yag.send(email, 'new court openings!', email_html)

def transfer_openings(cursor):
    transfer = """
        TRUNCATE openings;
        INSERT INTO openings
            SELECT * from current_openings;
    """
    cursor.execute(transfer)

async def etl():
    all_court_times = await get_all_court_times()
    conn_str = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(conn_str)
    with conn:
        with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cursor:
            openings = get_openings(cursor, all_court_times)
            insert_openings(cursor, openings)
            send_emails(cursor)
            transfer_openings(cursor)
    conn.commit()
    conn.close()
    print('done!')

async def main():
    print('\nPress Ctrl-C to quit at anytime!\n')
    scheduler = AsyncIOScheduler()
    scheduler.add_job(etl, "interval", seconds=int(os.environ.get('FETCH_INTERVAL_SECONDS')) or 60)
    scheduler.start()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(main())
    loop.run_forever()
