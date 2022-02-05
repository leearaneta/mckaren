import asyncio
from etl import etl
from apscheduler.schedulers.asyncio import AsyncIOScheduler


async def main():
    print('\nPress Ctrl-C to quit at anytime!\n')
    scheduler = AsyncIOScheduler()
    scheduler.add_job(etl, "interval", seconds=60)
    scheduler.start()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(main())
    loop.run_forever()