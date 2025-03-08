import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import CameraComponent from '../components/CameraComponent';
import HeartHealthScoreCard from '../components/HeartHealthScoreCard';
import { getFoodDescription, updateFoodDescription, analyzeHeartHealth, HeartHealthAnalysis } from '../api/openai';
import { healthScoreService } from '../services/HealthScoreService';
import { manageReminderNotification } from '../utils/notifications';

const { width } = Dimensions.get('window');

// Theme colors
const COLORS = {
  primary: '#D32F2F',          // Primary red (was #4285F4 blue)
  primaryLight: '#FFEBEE',     // Light red background (was #f1f8ff light blue)
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
}

// Default empty analysis object
const emptyAnalysis: HeartHealthAnalysis = {
  scores: {
    unhealthyFat: { score: 0, explanation: '' },
    healthyFat: { score: 0, explanation: '' },
    sodium: { score: 0, explanation: '' },
    fiber: { score: 0, explanation: '' },
    nutrientDensity: { score: 0, explanation: '' },
    processingLevel: { score: 0, explanation: '' },
    sugar: { score: 0, explanation: '' },
    additives: { score: 0, explanation: '' },
  },
  overallScore: 0,
  keyTakeaway: '',
};

const FoodAnalysisScreen: React.FC = () => {
  // UI state
  const [showCamera, setShowCamera] = useState(false);
  const [currentStep, setCurrentStep] = useState<'initial' | 'description' | 'analysis'>('initial');
  
  // Data state
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [foodDescription, setFoodDescription] = useState<string>('');
  const [analysis, setAnalysis] = useState<HeartHealthAnalysis>(emptyAnalysis);
  
  // Input state
  const [userInput, setUserInput] = useState<string>('');
  
  // Loading states
  const [isDescribing, setIsDescribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  
  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Navigation
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // Track last processed parameter timestamp
  const lastProcessedTimestamp = useRef<number>(0);
  
  // Process route params when screen focuses or params change
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params;
      
      if (params?.showDescription && params?.description && params?.imageBase64) {
        // Check if this is a new set of params by comparing timestamp
        const currentTimestamp = params.timestamp || 0;
        
        if (currentTimestamp > lastProcessedTimestamp.current) {
          console.log("Got description from camera screen");
          setImageBase64(params.imageBase64);
          setFoodDescription(params.description);
          setCurrentStep('description');
          
          // Update our timestamp reference
          lastProcessedTimestamp.current = currentTimestamp;
          
          // Clear params to avoid reprocessing on accidental refocus
          // But keep a small delay to avoid issues during the transition
          setTimeout(() => {
            navigation.setParams({
              showDescription: undefined,
              description: undefined,
              imageBase64: undefined,
              timestamp: undefined
            });
          }, 500);
        }
      }
    }, [route.params])
  );

  // Handle the image picker from gallery
  const handlePickImage = async () => {
    try {
      setIsGalleryLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        await handleImageCaptured(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsGalleryLoading(false);
    }
  };

  // Handle captured image from camera - Step 1
  const handleImageCaptured = async (base64: string) => {
    console.log("Image captured, length:", base64.length);
    setShowCamera(false);
    setImageBase64(base64);
    setErrorMessage(null);
    
    if (!base64 || base64.length < 100) {
      setErrorMessage("Image data is incomplete or invalid");
      Alert.alert('Error', 'The captured image data is invalid. Please try again.');
      return;
    }
    
    try {
      setIsDescribing(true);
      console.log("Getting food description...");
      const description = await getFoodDescription(base64);
      console.log("Description received");
      
      if (!description || description.trim() === '') {
        throw new Error("Failed to generate a description for this image");
      }
      
      setFoodDescription(description);
      setCurrentStep('description');
    } catch (error: any) {
      console.error('Error getting description:', error.message || error);
      setErrorMessage(error.message || "Unknown error occurred");
      Alert.alert('Error', `Failed to describe the image: ${error.message || "Please try again."}`);
    } finally {
      setIsDescribing(false);
    }
  };

  // Handle analyzing heart health - Step 2
  const handleAnalyzeHeartHealth = async () => {
    if (!foodDescription.trim()) {
      Alert.alert('Error', 'Food description is required for analysis.');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      console.log("Analyzing heart health...");
      const heartHealthAnalysis = await analyzeHeartHealth(foodDescription);
      console.log("Analysis received");
      
      // Log the food score
      await healthScoreService.logScore(foodDescription, heartHealthAnalysis);
      
      // Update streak and manage notifications
      await healthScoreService.updateStreak();
      await manageReminderNotification(true);  // User has scanned food today
      
      setAnalysis(heartHealthAnalysis);
      setCurrentStep('analysis');
    } catch (error: any) {
      console.error('Error analyzing heart health:', error.message || error);
      setErrorMessage(error.message || "Unknown error occurred");
      Alert.alert('Error', `Failed to analyze heart health: ${error.message || "Please try again."}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle updating the description with user input
  const handleUpdateDescription = async () => {
    if (!userInput.trim()) {
      Alert.alert('Input Required', 'Please provide additional information to update the description.');
      return;
    }

    try {
      setIsUpdating(true);
      const updatedDescription = await updateFoodDescription(foodDescription, userInput);
      setFoodDescription(updatedDescription);
      setUserInput('');
    } catch (error: any) {
      console.error('Error updating description:', error.message || error);
      Alert.alert('Error', 'Failed to update the description. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset the analysis
  const handleReset = () => {
    setImageBase64(null);
    setFoodDescription('');
    setAnalysis(emptyAnalysis);
    setUserInput('');
    setErrorMessage(null);
    setCurrentStep('initial');
  };

  // Back to description from analysis
  const handleBackToDescription = () => {
    setCurrentStep('description');
  };

  // Back to home from description
  const handleBackToHome = () => {
    setCurrentStep('initial');
  };

  // Render feature card
  const renderFeatureCard = (icon: string, title: string, description: string) => (
    <View style={styles.featureCard}>
      <View style={styles.featureIconContainer}>
        <MaterialCommunityIcons name={icon as any} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>HeartHealthAI</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {showCamera ? (
          <CameraComponent
            onImageCaptured={handleImageCaptured}
            onClose={() => setShowCamera(false)}
          />
        ) : (
          <>
            {currentStep === 'initial' ? (
              <View style={styles.homeContainer}>
                {/* Hero section */}
                <View style={styles.heroSection}>
                  <View style={styles.heroContent}>
                    <Text style={styles.heroTitle}>Analyze Your Food's Heart Health Impact</Text>
                    <Text style={styles.heroSubtitle}>
                      Take a photo of your meal or select from gallery to get a detailed heart health analysis
                    </Text>
                    
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.primaryActionButton]}
                        onPress={() => setShowCamera(true)}
                        disabled={isGalleryLoading}
                      >
                        <Ionicons name="camera" size={24} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>Take Photo</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryActionButton]}
                        onPress={handlePickImage}
                        disabled={isGalleryLoading}
                      >
                        {isGalleryLoading ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                          <>
                            <Ionicons name="images" size={24} color={COLORS.primary} />
                            <Text style={styles.secondaryActionButtonText}>Select Image</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.heroImageContainer}>
                    <View style={styles.heroImageFallback}>
                      <Ionicons name="heart" size={60} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
                
                {/* How it works */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>How It Works</Text>
                  <View style={styles.stepsContainer}>
                    <View style={styles.step}>
                      <View style={[styles.stepIconContainer, { backgroundColor: COLORS.primaryLight }]}>
                        <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.stepNumber}>1</Text>
                      </View>
                      <Text style={styles.stepTitle}>Capture Food</Text>
                      <Text style={styles.stepDescription}>Take a photo of your meal or select from your gallery</Text>
                    </View>
                    
                    <View style={styles.step}>
                      <View style={[styles.stepIconContainer, { backgroundColor: '#fef6e6' }]}>
                        <Ionicons name="document-text-outline" size={24} color="#F9AB40" />
                        <Text style={styles.stepNumber}>2</Text>
                      </View>
                      <Text style={styles.stepTitle}>Review Description</Text>
                      <Text style={styles.stepDescription}>Verify or edit the AI-generated food description</Text>
                    </View>
                    
                    <View style={styles.step}>
                      <View style={[styles.stepIconContainer, { backgroundColor: '#eefaee' }]}>
                        <Ionicons name="heart-outline" size={24} color={COLORS.success} />
                        <Text style={styles.stepNumber}>3</Text>
                      </View>
                      <Text style={styles.stepTitle}>Get Analysis</Text>
                      <Text style={styles.stepDescription}>Receive detailed heart health scores and recommendations</Text>
                    </View>
                  </View>
                </View>
                
                {/* Features Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Features</Text>
                  <View style={styles.featuresGrid}>
                    {renderFeatureCard('heart-pulse', 'Heart Health Score', 'Get an overall score with breakdown of key health factors')}
                    {renderFeatureCard('food-apple', 'Nutritional Insights', 'Understand the nutritional profile of your meals')}
                    {renderFeatureCard('lightbulb-on', 'Smart Recommendations', 'Receive personalized suggestions for healthier choices')}
                    {renderFeatureCard('history', 'Quick Analysis', 'Get results in seconds using advanced AI technology')}
                  </View>
                </View>
              </View>
            ) : imageBase64 ? (
              <View style={styles.analysisContainer}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                    style={styles.foodImage}
                    resizeMode="cover"
                  />
                </View>

                {errorMessage && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => setShowCamera(true)}
                    >
                      <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 1: Description Screen */}
                {currentStep === 'description' && (
                  <>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={handleBackToHome}
                    >
                      <Ionicons name="arrow-back" size={20} color={COLORS.gray} />
                      <Text style={styles.backButtonText}>Back to Home</Text>
                    </TouchableOpacity>

                    {isDescribing ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Identifying your food...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.sectionTitle}>Food Description</Text>
                        <View style={styles.descriptionContainer}>
                          <Text style={styles.description}>{foodDescription}</Text>
                        </View>
                        
                        <Text style={styles.sectionTitle}>Edit Description</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Add missing details or provide corrections..."
                          value={userInput}
                          onChangeText={setUserInput}
                          multiline
                          numberOfLines={3}
                        />

                        <View style={styles.buttonRow}>
                          <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={handleUpdateDescription}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <ActivityIndicator size="small" color={COLORS.gray} />
                            ) : (
                              <View style={styles.buttonContent}>
                                <Text style={styles.secondaryButtonText}>Update Description</Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          <View style={styles.buttonSpacer} />

                          <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={handleAnalyzeHeartHealth}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? (
                              <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                              <View style={styles.buttonContent}>
                                <Text style={styles.primaryButtonText}>
                                  Analyze{Platform.OS === 'ios' ? ' ' : '\n'}Health Impact
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* STEP 2: Analysis Screen */}
                {currentStep === 'analysis' && (
                  <>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={handleBackToDescription}
                    >
                      <Ionicons name="arrow-back" size={20} color={COLORS.gray} />
                      <Text style={styles.backButtonText}>Back to Description</Text>
                    </TouchableOpacity>
                    
                    {/* Heart Health Score Card */}
                    {analysis.overallScore > 0 && (
                      <HeartHealthScoreCard 
                        analysis={analysis} 
                        foodDescription={foodDescription}
                        onLogSuccess={handleReset}
                        onDiscard={handleBackToDescription}
                      />
                    )}
                    
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={handleReset}
                    >
                      <Text style={styles.resetButtonText}>Start Over</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  },
  contentContainer: {
    flexGrow: 1,
  },
  homeContainer: {
    flex: 1,
    padding: 20,
  },
  heroSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    paddingRight: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    lineHeight: 22,
    marginBottom: 24,
  },
  heroImageContainer: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `rgba(211, 47, 47, 0.2)`, // Transparent red border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryActionButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryActionButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  secondaryActionButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.black,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  stepIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    color: COLORS.black,
  },
  stepDescription: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 56) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.black,
  },
  featureDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: COLORS.gray,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  analysisContainer: {
    padding: 20,
  },
  imageContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  descriptionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.black,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fdcecf',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginBottom: 10,
  },
  retryButton: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonSpacer: {
    width: 12,
  },
  button: {
    flex: 1,
    height: Platform.OS === 'android' ? 60 : 50,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '48%', // Ensure buttons don't exceed this width
  },
  buttonContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    ...Platform.select({
      android: {
        lineHeight: 22,
      }
    })
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  secondaryButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
  },
  resetButton: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
});

export default FoodAnalysisScreen; 