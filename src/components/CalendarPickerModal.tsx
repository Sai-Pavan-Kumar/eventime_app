import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react-native';
import { haptic } from '../lib/haptics';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarPickerModalProps {
  visible: boolean;
  selectedDate: string | null;
  eventDates?: Set<string>;
  onSelectDate: (dateStr: string) => void;
  onClearDate: () => void;
  onClose: () => void;
}

export const CalendarPickerModal = React.memo<CalendarPickerModalProps>(({
  visible,
  selectedDate,
  eventDates,
  onSelectDate,
  onClearDate,
  onClose,
}) => {
  const [calendarYear, setCalendarYear] = useState(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    return new Date().getFullYear();
  });

  const [calendarMonth, setCalendarMonth] = useState(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) return parsed.getMonth();
    }
    return new Date().getMonth();
  });

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    const totalCells = Math.ceil(days.length / 7) * 7;
    while (days.length < totalCells) {
      days.push(null);
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = useCallback(() => {
    haptic.light();
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }, [calendarMonth]);

  const handleNextMonth = useCallback(() => {
    haptic.light();
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }, [calendarMonth]);

  const handleSelectDay = useCallback((day: number) => {
    haptic.selection();
    const m = String(calendarMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelectDate(`${calendarYear}-${m}-${d}`);
    onClose();
  }, [calendarYear, calendarMonth, onSelectDate, onClose]);

  const handleSelectToday = useCallback(() => {
    haptic.selection();
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    onSelectDate(`${y}-${m}-${d}`);
    setCalendarYear(y);
    setCalendarMonth(now.getMonth());
    onClose();
  }, [onSelectDate, onClose]);

  const handleClear = useCallback(() => {
    haptic.light();
    onClearDate();
    onClose();
  }, [onClearDate, onClose]);

  if (!visible) return null;

  const now = new Date();

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.calendarModalContent}>
        {/* Header */}
        <View style={styles.calendarModalHeader}>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <ChevronLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
              <ChevronRight size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Weekday Names */}
        <View style={styles.weekdayRow}>
          {WEEKDAY_NAMES.map((day, idx) => (
            <View key={idx} style={styles.weekdayCellWrapper}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return (
                <View key={`empty-${idx}`} style={styles.dayCellWrapper}>
                  <View style={styles.emptyDayCell} />
                </View>
              );
            }

            const m = String(calendarMonth + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            const dateKey = `${calendarYear}-${m}-${d}`;
            const isSelected = selectedDate === dateKey;
            const hasEvents = eventDates?.has(dateKey);

            const isToday =
              now.getFullYear() === calendarYear &&
              now.getMonth() === calendarMonth &&
              now.getDate() === day;

            const isPast =
              !isToday &&
              new Date(calendarYear, calendarMonth, day, 23, 59, 59).getTime() < now.getTime();

            return (
              <View key={`day-${idx}`} style={styles.dayCellWrapper}>
                <TouchableOpacity
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasEvents && !isSelected && (
                    <View
                      style={[
                        styles.eventDot,
                        isPast ? styles.eventDotPast : styles.eventDotUpcoming,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Modal Bottom Actions */}
        <View style={styles.calendarModalFooter}>
          <TouchableOpacity style={styles.todayBtn} onPress={handleSelectToday}>
            <Clock size={14} color="#6C47FF" />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>

          {selectedDate && (
            <TouchableOpacity style={styles.clearDateBtn} onPress={handleClear}>
              <Text style={styles.clearDateBtnText}>Clear Date</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  calendarModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
    minWidth: 140,
    textAlign: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCellWrapper: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    textAlign: 'center',
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  emptyDayCell: {
    width: 36,
    height: 36,
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#6C47FF',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#6C47FF',
  },
  dayText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#0F172A',
  },
  dayTextSelected: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
  },
  dayTextToday: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
  },
  eventDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventDotUpcoming: {
    backgroundColor: '#6C47FF',
  },
  eventDotPast: {
    backgroundColor: '#0F172A',
  },
  calendarModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
  },
  todayBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#6C47FF',
  },
  clearDateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
  },
  clearDateBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#DC2626',
  },
});
