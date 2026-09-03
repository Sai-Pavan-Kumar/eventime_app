import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface DatePickerModalProps {
  visible: boolean;
  title?: string;
  initialDateString?: string | null;
  onSelect: (formattedDate: string, isoDate: string) => void;
  onClose: () => void;
  allowClear?: boolean;
  onClear?: () => void;
}

export function DatePickerModal({
  visible,
  title = 'Select Date',
  initialDateString,
  onSelect,
  onClose,
  allowClear = false,
  onClear,
}: DatePickerModalProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (initialDateString) {
      const parsed = new Date(initialDateString);
      if (!isNaN(parsed.getTime())) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
        setSelectedDay(parsed.getDate());
      }
    } else {
      setSelectedDay(null);
    }
  }, [initialDateString, visible]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePickDay = (day: number) => {
    setSelectedDay(day);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mStr}-${dStr}`;
    const formatted = `${day} ${MONTHS_SHORT[viewMonth]} ${viewYear}`;
    onSelect(formatted, iso);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.container}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerActions}>
              {allowClear && onClear && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    onClear();
                    onClose();
                  }}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.monthNavBtn} onPress={prevMonth} activeOpacity={0.7}>
              <ChevronLeft size={20} color="#6C47FF" />
            </TouchableOpacity>
            <Text style={styles.monthYearTitle}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity style={styles.monthNavBtn} onPress={nextMonth} activeOpacity={0.7}>
              <ChevronRight size={20} color="#6C47FF" />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaderRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.dayHeaderCell}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;
              const isSelected = selectedDay === day;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedDayCell,
                  ]}
                  onPress={() => handlePickDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isToday && styles.todayCellText,
                      isSelected && styles.selectedDayCellText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  clearBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#EF4444',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dayHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#6C47FF',
  },
  selectedDayCell: {
    backgroundColor: '#6C47FF',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  dayCellText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  todayCellText: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
  },
  selectedDayCellText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
  },
});
