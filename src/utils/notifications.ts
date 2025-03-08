import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification IDs keys
const REMINDER_NOTIFICATION_ID_KEY = 'reminderNotificationId';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  // Only ask for permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  // If permission denied in iOS, we need to direct user to settings
  if (finalStatus !== 'granted') {
    return false;
  }
  
  return true;
}

/**
 * Schedule a daily reminder to scan food
 */
export async function scheduleFoodScanReminder(hour: number = 18, minute: number = 0) {
  try {
    // Cancel any existing reminders first
    await cancelFoodScanReminder();
    
    // Notification content
    const notificationContent = {
      title: "Daily Health Reminder",
      body: "Have you scanned any food today? Track your heart health!",
      data: { type: 'food_scan_reminder' },
    };
    
    // Set trigger time for notification
    const trigger = {
      hour,
      minute,
      repeats: true,
    };
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });
    
    // Save the notification ID
    await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, notificationId);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel the daily food scan reminder
 */
export async function cancelFoodScanReminder() {
  try {
    const notificationId = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
    
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
    }
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Check and manage reminder notification based on user activity
 * @param hasScannedToday Whether the user has already scanned food today
 */
export async function manageReminderNotification(hasScannedToday: boolean) {
  if (hasScannedToday) {
    // If user has already scanned food today, cancel the reminder
    await cancelFoodScanReminder();
  } else {
    // If user hasn't scanned food, schedule a reminder for later today
    const now = new Date();
    const hour = now.getHours() >= 18 ? 20 : 18; // If it's past 6pm, remind at 8pm, otherwise 6pm
    
    await scheduleFoodScanReminder(hour, 0);
  }
} 