import { useState, useCallback, useEffect } from 'react'
import { useLocation, useMatch } from 'react-router-dom'
import { DocumentSnapshot, onSnapshot } from 'firebase/firestore'
import { Coordinates, TransportMode } from '@entur/sdk'
import {
    Theme,
    DrawableRoute,
    CustomTile,
    Direction,
    DashboardTypes,
} from '../types'
import { getSettingsReference } from '../services/firebase'
import { useUser } from '../UserProvider'
import {
    persist as persistToUrl,
    restore as restoreFromUrl,
} from './UrlStorage'
import {
    persistSingleField as persistSingleFieldToFirebase,
    persistMultipleFields as persistMultipleFieldsToFirebase,
    FieldTypes,
} from './FirestoreStorage'
import type { SettingsSetter } from './SettingsProvider'

export type Mode = 'bysykkel' | 'kollektiv' | 'sparkesykkel' | 'delebil'

export interface Settings {
    boardName?: string
    coordinates?: Coordinates
    hiddenMobilityOperators: string[]
    hiddenStations: string[]
    hiddenStops: string[]
    hiddenModes: Mode[]
    hiddenStopModes: { [stopPlaceId: string]: TransportMode[] }
    hiddenRoutes: {
        [stopPlaceId: string]: string[]
    }
    distance?: number
    zoom?: number
    newStations?: string[]
    newStops?: string[]
    dashboard?: DashboardTypes
    owners?: string[]
    theme?: Theme
    logo?: string
    logoSize?: string
    description?: string
    showMap?: boolean
    showWeather?: boolean
    showIcon?: boolean
    showTemperature?: boolean
    showWind?: boolean
    showPrecipitation?: boolean
    showRoutesInMap: boolean
    permanentlyVisibleRoutesInMap: DrawableRoute[]
    hideSituations?: boolean
    hideTracks?: boolean
    hideWalkInfo?: boolean
    hideRealtimeData?: boolean
    hiddenRealtimeDataLineRefs: string[]
    isScheduledForDelete?: boolean
    customImageTiles: CustomTile[]
    customQrTiles: CustomTile[]
    showCustomTiles: boolean
    hiddenCustomTileIds: string[]
    fontScale?: number
    direction?: Direction
    pageRefreshedAt?: number
}

const DEFAULT_SETTINGS: Partial<Settings> = {
    description: '',
    logoSize: '32px',
    theme: Theme.DEFAULT,
    owners: [] as string[],
    hiddenStopModes: {},
    hiddenRealtimeDataLineRefs: [],
    hideRealtimeData: true,
    showRoutesInMap: true,
    permanentlyVisibleRoutesInMap: [],
    customImageTiles: [],
    customQrTiles: [],
    showCustomTiles: false,
    hiddenCustomTileIds: [],
}

export function useFirebaseSettings(): [Settings | null, SettingsSetter] {
    const [settings, setLocalSettings] = useState<Settings | null>(null)

    const location = useLocation()
    const user = useUser()

    const documentId = useMatch<'documentId', string>('/:page/:documentId')
        ?.params.documentId

    useEffect(() => {
        const protectedPath =
            location.pathname == '/' ||
            location.pathname.split('/')[1] == 'permissionDenied' ||
            location.pathname.split('/')[1] == 'privacy' ||
            location.pathname.split('/')[1] == 'tavler'

        if (protectedPath) {
            setLocalSettings(null)
            return
        }

        if (documentId) {
            return onSnapshot(
                getSettingsReference(documentId),
                (documentSnapshot: DocumentSnapshot) => {
                    if (!documentSnapshot.exists()) {
                        window.location.pathname = '/'
                        return
                    }

                    const data = documentSnapshot.data() as Settings

                    const settingsWithDefaults: Settings = {
                        ...DEFAULT_SETTINGS,
                        ...data,
                    }

                    // The fields under are added if missing, and if the tavle is not locked.
                    // If a tavle is locked by a user, you are not allowed to write to
                    // tavle unless you are logged in as the user who locked tavla, so we need
                    // to check if you have edit access.
                    const editAccess =
                        user &&
                        (!data.owners?.length || data.owners.includes(user.uid))

                    if (editAccess) {
                        Object.entries(DEFAULT_SETTINGS).forEach(
                            ([key, value]) => {
                                if (data[key as keyof Settings] === undefined) {
                                    persistSingleFieldToFirebase(
                                        documentId,
                                        key,
                                        value as FieldTypes,
                                    )
                                }
                            },
                        )
                    }

                    setLocalSettings((prevSettings) => {
                        const onAdmin =
                            location.pathname.split('/')[1] === 'admin'
                        return prevSettings && onAdmin
                            ? prevSettings
                            : settingsWithDefaults
                    })
                },
            )
        }

        let positionArray: string[] = []
        try {
            positionArray =
                location.pathname
                    ?.split('/')[2]
                    ?.split('@')[1]
                    ?.split('-')
                    .join('.')
                    .split(/,/) || []
        } catch (error) {
            return
        }

        setLocalSettings({
            ...DEFAULT_SETTINGS,
            ...restoreFromUrl(),
            coordinates: {
                latitude: Number(positionArray[0]),
                longitude: Number(positionArray[1]),
            },
        })
    }, [location, user, documentId])

    const setSettings = useCallback(
        (newSettings: Partial<Settings>) => {
            const mergedSettings = { ...settings, ...newSettings } as Settings
            setLocalSettings(mergedSettings)

            if (documentId) {
                persistMultipleFieldsToFirebase(documentId, mergedSettings)
                return
            }

            persistToUrl(mergedSettings)
        },
        [settings, documentId],
    )

    return [settings, setSettings]
}
