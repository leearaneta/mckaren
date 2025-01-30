import { HalfHourOpening } from "@mckaren/types";
import { Headers } from "~/types";
import { getHalfHourOpeningsFromReservations } from "~/utils/getHalfHourOpeningsFromReservations";
import { config } from "./config";
import superagent from "superagent";

type PPTCResponse = { CourtBooking_GetResult: string }
type PPTCData = [
  { name: string, id: string }[],
  { resourceId: string, stime: string, etime: string }[]
]

function formatTime(time: string) {
  const splitIndex = time.includes('AM') ? time.indexOf('AM') : time.indexOf('PM')
  return time.slice(0, splitIndex) + ' ' + time.slice(splitIndex)
}

export async function getHalfHourOpeningsForDate(date: Date, headers: Headers): Promise<Omit<HalfHourOpening, 'facility'>[]> {
  async function getBookingsAndCourtNames(
    resourceType: 'Clay' | 'Hard'
  ): Promise<{ bookings: { start: Date, end: Date, court: string }[], courtNames: string[] }> {
    const dateString = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const postBody = {
      "locationid": "Brooklyn",
      "resourcetype": resourceType,
      "start": dateString,
      "end": dateString,
      "CalledFrom": "WEB"
    }

    const response = await superagent.post(config.dataUrl)
      .set(headers)
      .send(postBody)

    const data = response.body as PPTCResponse;
    const [resources, _bookings] = JSON.parse(data.CourtBooking_GetResult) as PPTCData;
    const resourceNamesById = new Map(resources.map(r => [r.id, r.name]));

    function formatBooking(b: { stime: string, etime: string, resourceId: string }) {
      const formatted = {
        start: new Date(dateString + ' ' + formatTime(b.stime)) as Date,
        end: new Date(dateString + ' ' + formatTime(b.etime)) as Date,
        court: resourceNamesById.get(b.resourceId) as string
      }
      return formatted
    }

    const bookings = _bookings.map(formatBooking)
    return { bookings, courtNames: resources.map(r => r.name) }
  }

  const { courtNames: hardCourtNames, bookings: hardCourtBookings } = await getBookingsAndCourtNames('Hard')
  const { courtNames: clayCourtNames, bookings: clayCourtBookings } = await getBookingsAndCourtNames('Clay')

  const allCourtNames = [...hardCourtNames, ...clayCourtNames]
  const allBookings = [...hardCourtBookings, ...clayCourtBookings]

  const halfHourOpenings = getHalfHourOpeningsFromReservations(
    allBookings,
    allCourtNames,
    date,
    config.openHour!,
    config.closeHour!
  )

  return halfHourOpenings
}
