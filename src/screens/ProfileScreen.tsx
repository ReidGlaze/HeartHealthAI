import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { healthScoreService, DailyScore, LoggedScore, StreakData } from '../services/HealthScoreService';
import StreakBadge from '../components/StreakBadge';

// Theme colors to match the app
const COLORS = {
  primary: '#D32F2F',          // Primary red
  primaryLight: '#FFEBEE',     // Light red background
  primaryDark: '#B71C1C',      // Darker red for accents
  secondary: '#757575',        // Gray for secondary text
  background: '#f8f9fa',       // Light background
  white: '#FFFFFF',            // White
  black: '#202124',            // Near black for text
  error: '#D32F2F',            // Error red
  success: '#4CAF50',          // Success green 
  warning: '#FFC107',          // Warning yellow
  gray: '#5f6368',             // Gray for text
};

const ProfileScreen: React.FC = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [todayEntries, setTodayEntries] = useState<LoggedScore[]>([]);
  const [todayAverage, setTodayAverage] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMarkedDates, setCalendarMarkedDates] = useState<{[date: string]: any}>({});
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, lastActiveDate: '', bestStreak: 0 });
  
  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Get today's scores
      const today = new Date().toISOString().split('T')[0];
      const todayScores = await healthScoreService.getTodayScores();
      setTodayEntries(todayScores);
      
      // Calculate today's average
      const average = await healthScoreService.getTodayAverage();
      setTodayAverage(average);
      
      // Get all daily scores
      const allDailyScores = await healthScoreService.getDailyScores();
      setDailyScores(allDailyScores);
      
      // Get streak data
      const streak = await healthScoreService.getStreakData();
      setStreakData(streak);
      
      // Generate calendar markers
      const markers: {[date: string]: any} = {};
      
      allDailyScores.forEach(dailyScore => {
        const color = getScoreColor(dailyScore.averageScore);
        markers[dailyScore.date] = {
          selected: dailyScore.date === selectedDate,
          selectedColor: color,
          marked: true,
          dotColor: color,
        };
      });
      
      // Make sure today is marked even if no entries
      if (!markers[today]) {
        markers[today] = {
          selected: today === selectedDate,
          selectedColor: COLORS.gray,
        };
      }
      
      // Make sure selected date is marked
      if (markers[selectedDate]) {
        markers[selectedDate].selected = true;
      } else {
        markers[selectedDate] = {
          selected: true,
          selectedColor: COLORS.gray,
        };
      }
      
      setCalendarMarkedDates(markers);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDate])
  );
  
  // Handle calendar date selection
  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };
  
  // Find selected day entries
  const selectedDayEntries = dailyScores.find(score => score.date === selectedDate)?.entries || [];
  
  // Calculate selected day average
  const selectedDayAverage = selectedDayEntries.length > 0
    ? selectedDayEntries.reduce((sum, entry) => sum + entry.analysis.overallScore, 0) / selectedDayEntries.length
    : null;
  
  // Helper to get shortened description
  const getShortenedDescription = (description: string) => {
    // If less than 20 chars, return as is
    if (description.length <= 20) return description;
    
    // First check if there's a comma or dash to split on
    const firstComma = description.indexOf(',');
    if (firstComma > 0 && firstComma <= 25) {
      return description.substring(0, firstComma);
    }
    
    const firstDash = description.indexOf(' - ');
    if (firstDash > 0 && firstDash <= 25) {
      return description.substring(0, firstDash);
    }
    
    // Otherwise just take the first few words
    return description.substring(0, 20) + '...';
  };
  
  // Handle deletion of a food entry
  const handleDeleteEntry = async (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to remove this food entry? This will affect your daily score.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await healthScoreService.deleteScore(id);
              // Reload data after deletion
              await loadData();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Health Profile</Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your health data...</Text>
          </View>
        ) : (
          <>
            {/* Today's Health Score Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Today's Heart Health</Text>
                <View style={styles.averageContainer}>
                  {todayAverage !== null ? (
                    <>
                      <Text style={[styles.averageScore, { color: getScoreColor(todayAverage) }]}>
                        {todayAverage.toFixed(1)}
                      </Text>
                      <Text style={styles.averageLabel}>/10</Text>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>No entries today</Text>
                  )}
                </View>
              </View>
              
              <Text style={styles.summarySubtitle}>
                Based on {todayEntries.length} meal{todayEntries.length !== 1 ? 's' : ''} today
              </Text>
              
              {/* Streak Component */}
              <View style={styles.streakContainer}>
                <StreakBadge streak={streakData.currentStreak} size="medium" />
                <View style={styles.streakInfoContainer}>
                  <Text style={styles.streakInfoTitle}>Keep the Streak Going!</Text>
                  <Text style={styles.streakInfoText}>
                    Scan your food daily to maintain your streak and improve your heart health.
                  </Text>
                </View>
              </View>
              
              {/* Today's entries */}
              {todayEntries.length > 0 ? (
                <View style={styles.entriesContainer}>
                  <Text style={styles.sectionTitle}>Today's Entries</Text>
                  
                  {todayEntries.map((entry, index) => (
                    <View key={index} style={styles.entryRow}>
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryTime}>{entry.time}</Text>
                        <Text style={styles.entryName}>{getShortenedDescription(entry.description)}</Text>
                      </View>
                      <View style={styles.entryActions}>
                        <View style={[styles.scoreIndicator, { backgroundColor: getScoreColor(entry.analysis.overallScore) }]}>
                          <Text style={styles.entryScore}>{entry.analysis.overallScore.toFixed(1)}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteEntry(entry.id)}
                        >
                          <Ionicons name="close-circle" size={22} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noEntriesContainer}>
                  <Ionicons name="restaurant-outline" size={40} color={COLORS.gray} style={styles.noEntriesIcon} />
                  <Text style={styles.noEntriesText}>No meals logged today</Text>
                  <Text style={styles.noEntriesSubtext}>Log your meals to track your heart health</Text>
                </View>
              )}
            </View>
            
            {/* Calendar View Card */}
            <View style={styles.calendarCard}>
              <Text style={styles.cardTitle}>Heart Health Calendar</Text>
              
              <Calendar
                current={selectedDate}
                onDayPress={handleDayPress}
                markedDates={calendarMarkedDates}
                theme={{
                  calendarBackground: COLORS.white,
                  textSectionTitleColor: COLORS.black,
                  selectedDayBackgroundColor: COLORS.primary,
                  selectedDayTextColor: COLORS.white,
                  todayTextColor: COLORS.primary,
                  dayTextColor: COLORS.black,
                  textDisabledColor: '#d9e1e8',
                  monthTextColor: COLORS.black,
                  indicatorColor: COLORS.primary,
                  arrowColor: COLORS.primary,
                }}
                style={styles.calendar}
              />
              
              {/* Selected Date Entries */}
              <View style={styles.selectedDateContainer}>
                <View style={styles.selectedDateHeader}>
                  <Text style={styles.selectedDateTitle}>
                    {formatDateFull(selectedDate)}
                  </Text>
                  {selectedDayAverage !== null && (
                    <View style={styles.averageContainer}>
                      <Text style={[styles.selectedDateScore, { color: getScoreColor(selectedDayAverage) }]}>
                        {selectedDayAverage.toFixed(1)}
                      </Text>
                      <Text style={styles.averageLabel}>/10</Text>
                    </View>
                  )}
                </View>
                
                {selectedDayEntries.length > 0 ? (
                  <View style={styles.historicalDataContainer}>
                    {selectedDayEntries.map((entry, index) => (
                      <View key={index} style={styles.historyRow}>
                        <View style={styles.entryInfo}>
                          <Text style={styles.entryTime}>{entry.time}</Text>
                          <Text style={styles.entryName}>{getShortenedDescription(entry.description)}</Text>
                        </View>
                        <View style={styles.entryActions}>
                          <View style={[styles.scoreIndicator, { backgroundColor: getScoreColor(entry.analysis.overallScore) }]}>
                            <Text style={styles.entryScore}>{entry.analysis.overallScore.toFixed(1)}</Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteEntry(entry.id)}
                          >
                            <Ionicons name="close-circle" size={22} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noEntriesText}>No entries for this date</Text>
                )}
              </View>
            </View>
            
            {/* Tips Card */}
            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb-outline" size={24} color={COLORS.warning} />
                <Text style={styles.cardTitle}>Health Tips</Text>
              </View>
              <Text style={styles.tipText}>
                Tracking your daily food intake can help identify patterns and make better choices for heart health.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

// Helper functions
const getScoreColor = (score: number) => {
  if (score >= 8) return COLORS.success;
  if (score >= 5) return COLORS.warning;
  return COLORS.error;
};

const formatDateFull = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric' 
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  summarySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  averageScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  averageLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 2,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  entriesContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  entryInfo: {
    flex: 1,
  },
  entryTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  entryName: {
    fontSize: 15,
    color: COLORS.black,
  },
  scoreIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  noEntriesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noEntriesIcon: {
    marginBottom: 12,
  },
  noEntriesText: {
    fontSize: 16,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  noEntriesSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendar: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  selectedDateContainer: {
    marginTop: 8,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  selectedDateScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  historicalDataContainer: {
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  historyDate: {
    width: 70,
    fontSize: 14,
    color: COLORS.black,
  },
  historyScoreContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    position: 'relative',
  },
  historyScoreBar: {
    height: '100%',
    borderRadius: 12,
  },
  historyScore: {
    position: 'absolute',
    right: 12,
    top: 3,
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
  },
  streakInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  streakInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  streakInfoText: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 18,
  },
});

export default ProfileScreen; 