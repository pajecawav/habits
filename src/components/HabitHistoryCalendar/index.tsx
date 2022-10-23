import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getDateKey } from "@/lib";
import { settingsStore } from "@/stores/settingsStore";
import { DateKey, Habit } from "@/types";
import { cn } from "@/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import dayjs, { Dayjs } from "dayjs";
import { computed } from "mobx";
import { observer } from "mobx-react-lite";
import { memo, useMemo, useState } from "react";
import { Card } from "../Card";
import { UpdateHabitProgressModal } from "../UpdateHabitProgressModal";
import styles from "./HabitHistoryCalendar.module.css";

interface HabitHistoryCalendarProps {
	habit: Habit;
}

const RECT_SIZE = 11;
const CELL_SPACING = 1;
const HEADER_SIZE = 8;

const CELL_SIZE = RECT_SIZE + CELL_SPACING;

export const HabitHistoryCalendar = observer(
	({ habit }: HabitHistoryCalendarProps) => {
		const [selectedDateKey, setSelectedDateKey] = useState<DateKey | null>(
			null
		);

		const [offset, setOffset] = useState(0);
		const shiftLeft = () => setOffset(offset + 1);
		const shiftRight = () => setOffset(Math.max(0, offset - 1));

		const isExtraSmallScreen = useMediaQuery("xs", true);
		const totalWeeks = isExtraSmallScreen ? 12 : 18;

		const data = useMemo(() => {
			return computed(() => {
				const endDate = dayjs().subtract(offset, "weeks");
				const nowDateKey = getDateKey(new Date());

				let startDate = endDate
					.startOf("week")
					.subtract(totalWeeks, "weeks")
					.add(settingsStore.startOfWeek, "day");

				if (endDate.diff(startDate, "weeks") >= totalWeeks) {
					startDate = startDate.add(1, "weeks");
				}

				const weeks: number[][] = [];

				const date = startDate.toDate();
				for (let week = 0; week < totalWeeks; week++) {
					const weekValues = [];
					for (let day = 0; day < 7; day++) {
						const dateKey = getDateKey(date);
						weekValues.push(habit.entries[dateKey]?.value ?? 0);

						if (dateKey === nowDateKey) {
							break;
						}

						date.setDate(date.getDate() + 1);
					}
					weeks.push(weekValues);
				}

				return { startDate, weeks };
			});
		}, [habit.entries, offset, totalWeeks]).get();

		function indexesToDate(weekIndex: number, dayIndex: number): Dayjs {
			return data.startDate.add(weekIndex * 7 + dayIndex, "day");
		}

		function selectDate(weekIndex: number, dayIndex: number) {
			const dateKey = getDateKey(indexesToDate(weekIndex, dayIndex));
			setSelectedDateKey(dateKey);
		}

		return (
			<>
				<Card>
					<div className="flex items-center justify-between">
						<Card.Title>History</Card.Title>

						<div className="flex gap-1.5 sm:gap-0 text-gray-500 dark:text-neutral-500">
							<button onClick={shiftLeft}>
								<ChevronLeftIcon className="w-6 sm:w-5" />
							</button>
							<button
								className="disabled:text-neutral-300 dark:disabled:text-neutral-700"
								onClick={shiftRight}
								disabled={offset === 0}
							>
								<ChevronRightIcon className="w-6 sm:w-5" />
							</button>
						</div>
					</div>

					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox={`0 0 ${totalWeeks * CELL_SIZE + 12} ${
							HEADER_SIZE + 7 * CELL_SIZE
						}`}
						fill="currentColor"
					>
						{data.weeks.map((week, weekIndex) => (
							<g
								transform={`translate(${
									weekIndex * CELL_SIZE
								}, ${HEADER_SIZE})`}
								key={weekIndex}
							>
								{week.map((value, dayIndex) => (
									<g
										transform={`translate(0, ${
											dayIndex * CELL_SIZE
										})`}
										// TODO: replace with a single event listener on the parent
										onClick={() =>
											selectDate(weekIndex, dayIndex)
										}
										key={dayIndex}
									>
										<rect
											className={cn(
												"cursor-pointer",
												value
													? "text-sky-600 dark:text-blue-500"
													: "text-gray-200 dark:text-neutral-700"
											)}
											width={RECT_SIZE}
											height={RECT_SIZE}
											rx="2"
											ry="2"
										/>
										<text
											className={cn(
												styles.text,
												value
													? "text-white dark:text-neutral-800"
													: "text-gray-600 dark:text-neutral-400"
											)}
											y={RECT_SIZE / 2 + 0.5}
											x={RECT_SIZE / 2}
										>
											{indexesToDate(
												weekIndex,
												dayIndex
											).date()}
										</text>
									</g>
								))}
							</g>
						))}

						<MonthLabels
							startDate={data.startDate}
							totalWeeks={totalWeeks}
						/>
						<WeekDayLabels totalWeeks={totalWeeks} />
					</svg>
				</Card>

				{selectedDateKey && (
					<UpdateHabitProgressModal
						habitId={habit.id}
						value={habit.entries[selectedDateKey]?.value ?? 0}
						unit={habit.unit}
						date={selectedDateKey}
						onClose={() => setSelectedDateKey(null)}
					/>
				)}
			</>
		);
	}
);

const MonthLabels = memo(function MonthLabels({
	startDate,
	totalWeeks,
}: {
	startDate: Dayjs;
	totalWeeks: number;
}) {
	const labels = [];

	let date = startDate;
	for (let i = 0; i < totalWeeks - 1; i++) {
		const nextDate = date.add(7, "days");

		if (!nextDate.isSame(date, "month")) {
			labels.push(
				<text
					className="text-[5px] select-none text-gray-500 dark:text-neutral-500"
					y={HEADER_SIZE - 3}
					x={CELL_SIZE * i + 1}
					key={date.month()}
				>
					{date.format(labels.length === 0 ? "MMM YYYY" : "MMM")}
				</text>
			);
		}

		date = nextDate;
	}

	return <>{labels}</>;
});

const WeekDayLabels = observer(function ({
	totalWeeks,
}: {
	totalWeeks: number;
}) {
	let weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	const startIndex = settingsStore.startOfWeek;
	weekDays = [
		...weekDays.slice(startIndex),
		...weekDays.slice(0, startIndex),
	];

	return (
		<g
			transform={`translate(${
				CELL_SIZE * totalWeeks + 1
			}, ${HEADER_SIZE})`}
		>
			{weekDays.map((name, index) => (
				<text
					className="text-[5px] select-none text-gray-500 dark:text-neutral-500"
					y={7 + CELL_SIZE * index}
					key={name}
				>
					{name}
				</text>
			))}
		</g>
	);
});
