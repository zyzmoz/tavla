import React from 'react'
import { format, isSameDay } from 'date-fns'
import { nb } from 'date-fns/locale'
import { DataCell, TableRow } from '@entur/table'
import { Heading4 } from '@entur/typography'
import { LineData } from '../../types'
import './DateRow.scss'

type DateRowProps = {
    previousRow?: LineData
    currentRow: LineData
}

const DateRow: React.FC<DateRowProps> = ({ previousRow, currentRow }) => {
    const isNewDay =
        previousRow &&
        !isSameDay(previousRow.departureTime, currentRow.departureTime)

    const formatedDate = format(currentRow.departureTime, 'EEEE d. MMMM', {
        locale: nb,
    })

    return isNewDay ? (
        <TableRow className="date-row">
            <DataCell>
                <Heading4 as="h3">{formatedDate}</Heading4>
            </DataCell>
        </TableRow>
    ) : null
}

export { DateRow }
