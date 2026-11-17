import * as Location from 'expo-location'
import { PlainProblem } from './forms'

/** Where the phone is, as the API takes it with a board or a photo. */
export interface Spot {
  latitude: number
  longitude: number
  accuracyM: number | null
}

/** Why the phone couldn't say where it is, worded for the person holding it. */
export class LocationProblem extends PlainProblem {}

/**
 * The phone's position right now, asking for permission the first time. Boards are tagged
 * standing at them, so this asks for the best fix the phone can give.
 */
export async function currentSpot(): Promise<Spot> {
  const permission = await Location.requestForegroundPermissionsAsync()

  if (!permission.granted) throw new LocationProblem('Allow location for Greyboards in your phone settings, so we can place the board.')

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest })

    return {
      latitude: Number(position.coords.latitude.toFixed(6)),
      longitude: Number(position.coords.longitude.toFixed(6)),
      accuracyM: position.coords.accuracy === null ? null : Math.round(position.coords.accuracy),
    }
  } catch {
    throw new LocationProblem("We couldn't get a fix. Step outside or away from tall buildings and try again.")
  }
}

/**
 * Follow the compass, calling `onChange` with degrees from true north (magnetic north
 * when the phone can't tell). Resolves to a stop function. Phones without a compass
 * throw a LocationProblem.
 */
export async function watchHeading(onChange: (degrees: number) => void): Promise<() => void> {
  const permission = await Location.requestForegroundPermissionsAsync()

  if (!permission.granted) throw new LocationProblem('Allow location for Greyboards in your phone settings, so the compass can work.')

  try {
    const subscription = await Location.watchHeadingAsync((heading) => {
      const degrees = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading

      if (degrees >= 0) onChange(Math.round(degrees) % 360)
    })

    return () => subscription.remove()
  } catch {
    throw new LocationProblem("This phone has no compass we can read. Write which traffic sees the board instead.")
  }
}
