import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import DatePicker from 'react-native-date-picker';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {studentsAPI, namazAPI} from '../services/api';
import {theme} from '../theme/theme';

const NamazScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState('fajr');
  const [namazData, setNamazData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('track');

  const queryClient = useQueryClient();

  const prayers = [
    {value: 'fajr', label: 'Fajr', time: '05:30 AM'},
    {value: 'zuhr', label: 'Zuhr', time: '12:30 PM'},
    {value: 'asr', label: 'Asr', time: '04:00 PM'},
    {value: 'maghrib', label: 'Maghrib', time: '06:30 PM'},
    {value: 'isha', label: 'Isha', time: '08:00 PM'},
  ];

  // Get all students
  const {data: students = [], isLoading: studentsLoading} = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsAPI.getStudents(),
  });

  // Save namaz attendance mutation
  const saveNamazMutation = useMutation({
    mutationFn: (data: any) => namazAPI.saveNamazAttendance(data),
    onSuccess: () => {
      Alert.alert('Success', 'Namaz attendance saved successfully!');
      queryClient.invalidateQueries({queryKey: ['namaz']});
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save namaz attendance');
    },
  });

  const updateNamazStatus = (studentId: number, status: string) => {
    setNamazData((prev: any) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const setAllPresent = () => {
    const allPresentData: any = {};
    students.forEach((student: any) => {
      allPresentData[student.id] = 'present';
    });
    setNamazData(allPresentData);
  };

  const handleSaveNamaz = () => {
    const namazRecords = Object.entries(namazData).map(([studentId, status]) => ({
      studentId: parseInt(studentId),
      date: selectedDate.toISOString().split('T')[0],
      prayer: selectedPrayer,
      status,
    }));

    if (namazRecords.length === 0) {
      Alert.alert('Error', 'No attendance data to save');
      return;
    }

    saveNamazMutation.mutate(namazRecords);
  };

  const trackingTab = () => (
    <ScrollView style={styles.container}>
      <Card style={styles.controlCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Select Date & Prayer
          </Text>

          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}>
            {selectedDate.toLocaleDateString()}
          </Button>

          <DatePicker
            modal
            open={showDatePicker}
            date={selectedDate}
            mode="date"
            onConfirm={(date) => {
              setShowDatePicker(false);
              setSelectedDate(date);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text variant="bodyMedium" style={styles.prayerLabel}>
            Select Prayer:
          </Text>
          <View style={styles.prayerButtons}>
            {prayers.map((prayer) => (
              <Button
                key={prayer.value}
                mode={selectedPrayer === prayer.value ? 'contained' : 'outlined'}
                onPress={() => setSelectedPrayer(prayer.value)}
                style={styles.prayerButton}
                contentStyle={styles.prayerButtonContent}>
                <View style={styles.prayerButtonText}>
                  <Text variant="bodyMedium" style={styles.prayerName}>
                    {prayer.label}
                  </Text>
                  <Text variant="bodySmall" style={styles.prayerTime}>
                    {prayer.time}
                  </Text>
                </View>
              </Button>
            ))}
          </View>
        </Card.Content>
      </Card>

      {studentsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading students...</Text>
        </View>
      ) : students.length > 0 ? (
        <>
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={setAllPresent}
              style={styles.allPresentButton}>
              Mark All Present
            </Button>
            <Text variant="bodyMedium" style={styles.studentCount}>
              Total Students: {students.length}
            </Text>
          </View>

          {students.map((student: any) => {
            const status = namazData[student.id] || 'present';
            return (
              <Card key={student.id} style={styles.studentCard}>
                <Card.Content>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentInfo}>
                      <Text variant="titleMedium" style={styles.studentName}>
                        {student.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.studentDetails}>
                        Roll No: {student.rollNo} | {student.courseType.toUpperCase()} {student.year}
                        {student.courseDivision && ` ${student.courseDivision.charAt(0).toUpperCase() + student.courseDivision.slice(1)}`}
                        {student.batch && ` - Section ${student.batch}`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.attendanceButtons}>
                    <Button
                      mode={status === 'present' ? 'contained' : 'outlined'}
                      onPress={() => updateNamazStatus(student.id, 'present')}
                      style={[styles.statusButton, status === 'present' && styles.presentButton]}
                      contentStyle={styles.buttonContent}>
                      Present
                    </Button>
                    <Button
                      mode={status === 'absent' ? 'contained' : 'outlined'}
                      onPress={() => updateNamazStatus(student.id, 'absent')}
                      style={[styles.statusButton, status === 'absent' && styles.absentButton]}
                      contentStyle={styles.buttonContent}>
                      Absent
                    </Button>
                    <Button
                      mode={status === 'on-leave' ? 'contained' : 'outlined'}
                      onPress={() => updateNamazStatus(student.id, 'on-leave')}
                      style={[styles.statusButton, status === 'on-leave' && styles.leaveButton]}
                      contentStyle={styles.buttonContent}>
                      On Leave
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          })}

          <View style={styles.saveContainer}>
            <Button
              mode="contained"
              onPress={handleSaveNamaz}
              loading={saveNamazMutation.isPending}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}>
              Save Namaz Attendance
            </Button>
          </View>
        </>
      ) : (
        <Card style={styles.noStudentsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.noStudentsText}>
              No students found
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.mainContainer}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          {value: 'track', label: 'Track Namaz'},
          {value: 'sheet', label: 'Namaz Sheet'},
        ]}
        style={styles.segmentedButtons}
      />

      {activeTab === 'track' && trackingTab()}
      {activeTab === 'sheet' && (
        <View style={styles.placeholderContainer}>
          <Text variant="titleMedium">Namaz Attendance Sheet</Text>
          <Text variant="bodyMedium">Coming soon...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  segmentedButtons: {
    margin: 16,
  },
  controlCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  dateButton: {
    marginBottom: 16,
  },
  prayerLabel: {
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  prayerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  prayerButton: {
    width: '48%',
    marginBottom: 8,
  },
  prayerButtonContent: {
    paddingVertical: 8,
  },
  prayerButtonText: {
    alignItems: 'center',
  },
  prayerName: {
    fontWeight: 'bold',
  },
  prayerTime: {
    marginTop: 2,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  allPresentButton: {
    backgroundColor: theme.colors.success,
  },
  studentCount: {
    color: theme.colors.outline,
  },
  studentCard: {
    marginBottom: 12,
    elevation: 2,
  },
  studentHeader: {
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  studentDetails: {
    color: theme.colors.outline,
    marginTop: 4,
  },
  attendanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  presentButton: {
    backgroundColor: theme.colors.success,
  },
  absentButton: {
    backgroundColor: theme.colors.error,
  },
  leaveButton: {
    backgroundColor: theme.colors.warning,
  },
  saveContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  noStudentsCard: {
    marginTop: 24,
    elevation: 2,
  },
  noStudentsText: {
    textAlign: 'center',
    color: theme.colors.outline,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});

export default NamazScreen;