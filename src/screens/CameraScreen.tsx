import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import CameraComponent from '../components/CameraComponent';
import { getFoodDescription } from '../api/openai';
import { useNavigation, CommonActions } from '@react-navigation/native';

// Theme colors
const COLORS = {
  primary: '#D32F2F',          // Primary red
  primaryLight: '#FFEBEE',     // Light red background
  primaryDark: '#B71C1C',      // Darker red for accents
  secondary: '#757575',        // Gray for secondary text
  background: '#f8f9fa',       // Light background
  white: '#FFFFFF',            // White
  black: '#202124',            // Near black for text
  error: '#D32F2F',            // Error red (already red)
  errorLight: '#FFEBEE',       // Light error background
  success: '#4CAF50',          // Success green 
  warning: '#FFC107',          // Warning yellow
  gray: '#5f6368',             // Gray for text
};

const CameraScreen: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  // Handle the captured image with improved error handling
  const handleImageCaptured = async (base64: string) => {
    try {
      // Reset error state
      setProcessingError(null);
      setIsProcessing(true);
      
      // Validate image data
      if (!base64 || base64.length < 100) {
        throw new Error("Invalid image data received");
      }
      
      // Get food description
      console.log("Getting food description...");
      const description = await getFoodDescription(base64);
      console.log("Description generated successfully");
      
      if (!description || description.trim() === '') {
        throw new Error("Unable to generate description for this image");
      }
      
      // Use a more reliable navigation method that works better on iOS
      if (Platform.OS === 'ios') {
        // For iOS, use CommonActions reset to ensure clean navigation stack
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              { 
                name: 'Home',
                params: {
                  imageBase64: base64,
                  description,
                  showDescription: true,
                  timestamp: new Date().getTime() // Add timestamp to ensure params are recognized as new
                }
              },
            ],
          })
        );
      } else {
        // For Android, regular navigation works fine
        navigation.navigate('Home', {
          imageBase64: base64,
          description,
          showDescription: true,
          timestamp: new Date().getTime() // Add timestamp to ensure params are recognized as new
        });
      }
      
    } catch (error: any) {
      console.error('Error processing image:', error);
      setProcessingError(error.message || "An unknown error occurred");
      Alert.alert(
        'Processing Error', 
        `Failed to process the image: ${error.message || "Please try again."}`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Home') 
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle closing the camera
  const handleClose = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {isProcessing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analyzing your food...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
          
          {processingError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{processingError}</Text>
            </View>
          )}
        </View>
      ) : (
        <CameraComponent
          onImageCaptured={handleImageCaptured}
          onClose={handleClose}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.gray,
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    width: '90%',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  }
});

export default CameraScreen; 