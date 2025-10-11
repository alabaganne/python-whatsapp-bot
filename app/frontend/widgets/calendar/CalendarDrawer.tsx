"use client";

import { DockNav } from "@features/navigation/dock-nav";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { CalendarContainer } from "@/widgets/calendar/CalendarContainer";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";
import { CalendarMainContent } from "@/widgets/calendar/CalendarMainContent";
import { useCalendarCore } from "@/widgets/calendar/hooks/useCalendarCore";

interface CalendarDrawerProps {
	className?: string;
	trigger?: React.ReactNode;
	side?: "left" | "right" | "top" | "bottom";
	initialView?: string;
	title?: string;
	disableDateClick?: boolean;
	/** Persist calendar state under this prefix; defaults to documents drawer */
	storageKeyPrefix?: string;
}

/**
 * CalendarDrawer renders a minimal calendar inside a drawer/sheet.
 * It reuses centralized calendar logic via useCalendarCore and CalendarMainContent.
 * Date click behavior can be disabled via prop and is intentionally modular.
 */
export function CalendarDrawer({
	className,
	trigger,
	side = "right",
	initialView = "listMonth",
	title = "Calendar",
	disableDateClick = true,
	storageKeyPrefix = "documents:calendar-drawer",
}: CalendarDrawerProps) {
	const [open, setOpen] = React.useState(false);
	const didInitOnOpenRef = React.useRef(false);

	// Centralized calendar state/logic
	const {
		calendarRef,
		calendarState,
		eventsState,
		processedEvents,
		calendarHeight,
		isRefreshing,
		isVacationDate,
		contextMenu,
		hoverCardWithDragging,
		dragHandlers,
		eventHandlers,
		callbacks: baseCallbacks,
		handleUpdateSize,
		setCalendarHeight,
		reservations,
		isLocalized,
	} = useCalendarCore({
		freeRoam: true,
		initialView,
		storageKeyPrefix,
		excludeConversations: true,
	});

	// Direct view change handler to affect this calendar instance even off calendar page
	const handleViewChangeDirect = React.useCallback(
		(view: string) => {
			try {
				const api = calendarRef?.current?.getApi?.();
				if (api) {
					try {
						api.setOption("validRange", undefined);
						api.setOption("eventConstraint", undefined);
						api.setOption("selectConstraint", undefined);
					} catch {}
					try {
						api.changeView(view);
					} catch {}
					try {
						requestAnimationFrame(() => {
							try {
								api.updateSize?.();
							} catch {}
						});
					} catch {}
				}
			} finally {
				calendarState.setCurrentView(view);
			}
		},
		[calendarRef, calendarState.setCurrentView]
	);

	// Keep stable refs for functions used inside open effect
	const setCurrentDateRef = React.useRef(calendarState.setCurrentDate);
	React.useEffect(() => {
		setCurrentDateRef.current = calendarState.setCurrentDate;
	}, [calendarState.setCurrentDate]);
	const viewChangeDirectRef = React.useRef(handleViewChangeDirect);
	React.useEffect(() => {
		viewChangeDirectRef.current = handleViewChangeDirect;
	}, [handleViewChangeDirect]);

	// Reset to today and force list view only once per drawer open
	React.useEffect(() => {
		if (!open) {
			didInitOnOpenRef.current = false;
			return;
		}
		if (didInitOnOpenRef.current) return;
		didInitOnOpenRef.current = true;
		try {
			const api = calendarRef?.current?.getApi?.();
			api?.today?.();
		} catch {}
		try {
			setCurrentDateRef.current?.(new Date());
		} catch {}
		try {
			viewChangeDirectRef.current?.("listMonth");
		} catch {}
	}, [open, calendarRef]);

	// Bridge for DockNav/Settings to control this calendar
	const { setState: setDockBridgeState } = useDockBridge();
	React.useEffect(() => {
		setDockBridgeState({
			calendarRef: (calendarRef || null) as React.RefObject<CalendarCoreRef | null>,
			currentCalendarView: calendarState.currentView,
			onCalendarViewChange: handleViewChangeDirect,
		});
	}, [handleViewChangeDirect, calendarRef, calendarState.currentView, setDockBridgeState]);

	// Optionally disable dateClick/select by overriding callbacks
	const callbacks = React.useMemo(() => {
		if (!disableDateClick) return baseCallbacks;
		return {
			dateClick: () => {},
			select: () => {},
			// In drawer, allow clicking past reservations (pass through to default)
			eventClick: baseCallbacks.eventClick,
		};
	}, [baseCallbacks, disableDateClick]);

	// Drawer width adapts to calendar view: list* views use 75vw, others expand
	const isListView = React.useMemo(() => {
		const view = calendarState.currentView || "";
		return view.startsWith("list");
	}, [calendarState.currentView]);

	const drawerWidthClass = isListView ? "w-[clamp(320px,75vw,840px)]" : "w-[95vw]";

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			{trigger ? (
				React.isValidElement(trigger) ? (
					<SheetTrigger asChild>{trigger}</SheetTrigger>
				) : (
					<SheetTrigger asChild>
						<Button variant="outline">Open Calendar</Button>
					</SheetTrigger>
				)
			) : (
				<SheetTrigger asChild>
					<Button variant="outline">Open Calendar</Button>
				</SheetTrigger>
			)}
			<SheetContent
				side={side}
				className={cn(`${drawerWidthClass} max-w-none sm:max-w-none p-0 flex flex-col overflow-hidden`, className)}
			>
				<SheetHeader className="px-4 py-3 border-b">
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>

				{/* Dock similar to header dock, single-view settings */}
				<div className="px-2 py-1 overflow-hidden">
					{/* No external arrows; navigation is inside the dock */}
					<DockNav
						className="mt-0"
						calendarRef={calendarRef}
						currentCalendarView={calendarState.currentView}
						onCalendarViewChange={handleViewChangeDirect}
						navigationOnly={true}
						layout="drawerThreeColumn"
					/>
				</div>

				<div className="px-2 pb-2 pt-0 flex-1 min-h-0">
					<ThemedScrollbar className="h-full" noScrollX={true}>
						<CalendarContainer
							loading={eventsState.loading}
							isHydrated={calendarState.isHydrated}
							isRefreshing={isRefreshing}
						>
							<div className="rounded-lg border border-border/50 bg-card/50 p-2">
								<CalendarMainContent
									calendarRef={calendarRef}
									processedEvents={processedEvents.filter((e) => (e as { type?: string }).type !== "conversation")}
									currentView={calendarState.currentView}
									currentDate={calendarState.currentDate}
									isLocalized={isLocalized}
									freeRoam={true}
									slotTimes={calendarState.slotTimes}
									slotTimesKey={calendarState.slotTimesKey}
									calendarHeight={calendarHeight}
									isVacationDate={isVacationDate}
									callbacks={callbacks}
									contextMenu={contextMenu}
									hoverCard={hoverCardWithDragging}
									dragHandlers={dragHandlers}
									conversations={{}}
									reservations={reservations}
									events={eventsState.events}
									dataTableEditor={{ handleEditReservation: () => {} }}
									handleOpenConversation={(waId) => {
										try {
											window.dispatchEvent(
												new CustomEvent("doc:user-select", {
													detail: { waId },
												})
											);
										} catch {}
										try {
											eventHandlers.handleOpenConversation(waId);
										} catch {}
									}}
									handleEventChange={eventHandlers.handleEventChange}
									handleCancelReservation={eventHandlers.handleCancelReservation}
									handleViewDetails={() => {}}
									handleOpenDocument={(waId) => {
										try {
											window.dispatchEvent(
												new CustomEvent("doc:user-select", {
													detail: { waId },
												})
											);
										} catch {}
									}}
									setCurrentView={calendarState.setCurrentView}
									setCalendarHeight={setCalendarHeight}
									handleUpdateSize={handleUpdateSize}
									isHydrated={calendarState.isHydrated}
									setCurrentDate={calendarState.setCurrentDate}
									disableHoverCards={true}
									disableNavLinks={true}
								/>
							</div>
						</CalendarContainer>
					</ThemedScrollbar>
				</div>
			</SheetContent>
		</Sheet>
	);
}
