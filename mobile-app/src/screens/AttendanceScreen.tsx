import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import {Picker} from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {studentsAPI, attendanceAPI, timetableAPI} from '../services/api';
import {theme} from '../theme/theme';

interface Student {
  id: number;
  name: string;
  rollNo: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  batch?: string;
}

interface AttendanceRecord {
  studentId: number;
  status: 'present' | 'absent' | 'leave';
}

const AttendanceScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [courseType, setCourseType] = useState('pu');
  const [year, setYear] = useState('1');
  const [courseDivision, setCourseDivision] = useState('commerce');
  const [section, setSection] = useState('A');
  const [period, setPeriod] = useState(1);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState('take');

  const queryClient = useQueryClient();

  // Get students based on filters
  const {data: students = [], isLoading: studentsLoading} = useQuery({
    queryKey: ['students', {courseType, year, courseDivision, section}],
    queryFn: () => studentsAPI.getStudents({
      courseType,
      year,
      courseDivision: courseType === 'post-pu' ? null : courseDivision,
      section: courseType === 'post-pu' ? null : section,
    }),
  });

  // Get periods/timetable
  const {data: periods = []} = useQuery({
    queryKey: ['periods', {courseType, year, courseDivision, section}],
    queryFn: () => timetableAPI.getPeriods({
      courseType,
      year,
      stream: courseDivision,
      section,
      dayOfWeek: selectedDate.toLocaleDateString('en-US', {weekday: 'long'}).toLowerCase(),
    }),
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: (data: any) => attendanceAPI.saveAttendance(data),
    onSuccess: () => {
      Alert.alert('Success', 'Attendance saved successfully!');
      queryClient.invalidateQueries({queryKey: ['attendance']});
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save attendance');
    },
  });

  // Initialize attendance data when students change
  useEffect(() => {
    if (students.length > 0) {
      setAttendanceData(
        students.map((student: Student) => ({
          studentId: student.id,
          status: 'present' as const,
        }))
      );
    }
  }, [students]);

  const updateAttendance = (studentId: number, status: 'present' | 'absent' | 'leave') => {
    setAttendanceData(prev =>
      prev.map(record =>
        record.studentId === studentId ? {...record, status} : record
      )
    );
  };

  const handleSaveAttendance = () => {
    if (attendanceData.length === 0) {
      Alert.alert('Error', 'No students to save attendance for');
      return;
    }

    const attendanceRecords = attendanceData.map(record => ({
      ...record,
      date: selectedDate.toISOString().split('T')[0],
      period,
      courseType,
      courseName: courseDivision,
      section: courseType === 'post-pu' ? null : section,
      batchYear: `${year}${courseType === 'pu' ? ' PU' : ' Year'}`,
    }));

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  const setAllPresent = () => {
    setAttendanceData(prev =>
      prev.map(record => ({...record, status: 'present' as const}))
    );
  };

  const renderStudentCard = ({item}: {item: Student}) => {
    const attendanceRecord = attendanceData.find(record => record.studentId === item.id);
    const status = attendanceRecord?.status || 'present';

    return (
      <Card style={styles.studentCard} key={item.id}>
        <Card.Content>
          <View style={styles.studentHeader}>
            <View style={styles.studentInfo}>
              <Text variant="titleMedium" style={styles.studentName}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.studentDetails}>
                Roll No: {item.rollNo} | {item.courseType.toUpperCase()} {item.year}
                {item.courseDivision && ` ${item.courseDivision.charAt(0).toUpperCase() + item.courseDivision.slice(1)}`}
                {item.batch && ` - Section ${item.batch}`}
              </Text>
            </View>
          </View>

          <View style={styles.attendanceButtons}>
            <Button
              mode={status === 'present' ? 'contained' : 'outlined'}
              onPress={() => updateAttendance(item.id, 'present')}
              style={[styles.statusButton, status === 'present' && styles.presentButton]}
              contentStyle={styles.buttonContent}>
              Present
            </Button>
            <Button
              mode={status === 'absent' ? 'contained' : 'outlined'}
              onPress={() => updateAttendance(item.id, 'absent')}
              style={[styles.statusButton, status === 'absent' && styles.absentButton]}
              contentStyle={styles.buttonContent}>
              Absent
            </Button>
            <Button
              mode={status === 'leave' ? 'contained' : 'outlined'}
              onPress={() => updateAttendance(item.id, 'leave')}
              style={[styles.statusButton, status === 'leave' && styles.leaveButton]}
              contentStyle={styles.buttonContent}>
              Leave
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const takeAttendanceTab = () => (
    <ScrollView style={styles.container}>
      {/* Date and Class Selection */}
      <Card style={styles.controlCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Select Date & Class
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

          <View style={styles.pickerContainer}>
            <Text variant="bodyMedium" style={styles.pickerLabel}>Course Type:</Text>
            <Picker
              selectedValue={courseType}
              onValueChange={setCourseType}
              style={styles.picker}>
              <Picker.Item label="PU College" value="pu" />
              <Picker.Item label="Post-PU" value="post-pu" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text variant="bodyMedium" style={styles.pickerLabel}>Year:</Text>
            <Picker
              selectedValue={year}
              onValueChange={setYear}
              style={styles.picker}>
              {courseType === 'pu' ? (
                <>
                  <Picker.Item label="1st Year" value="1" />
                  <Picker.Item label="2nd Year" value="2" />
                </>
              ) : (
                <>
                  <Picker.Item label="3rd Year" value="3" />
                  <Picker.Item label="4th Year" value="4" />
                  <Picker.Item label="5th Year" value="5" />
                  <Picker.Item label="6th Year" value="6" />
                  <Picker.Item label="7th Year" value="7" />
                </>
              )}
            </Picker>
          </View>

          {courseType === 'pu' && (
            <>
              <View style={styles.pickerContainer}>
                <Text variant="bodyMedium" style={styles.pickerLabel}>Division:</Text>
                <Picker
                  selectedValue={courseDivision}
                  onValueChange={setCourseDivision}
                  style={styles.picker}>
                  <Picker.Item label="Commerce" value="commerce" />
                  <Picker.Item label="Science" value="science" />
                </Picker>
              </View>

              {courseDivision === 'commerce' && (
                <View style={styles.pickerContainer}>
                  <Text variant="bodyMedium" style={styles.pickerLabel}>Section:</Text>
                  <Picker
                    selectedValue={section}
                    onValueChange={setSection}
                    style={styles.picker}>
                    <Picker.Item label="Section A" value="A" />
                    <Picker.Item label="Section B" value="B" />
                  </Picker>
                </View>
              )}
            </>
          )}

          <View style={styles.pickerContainer}>
            <Text variant="bodyMedium" style={styles.pickerLabel}>Period:</Text>
            <Picker
              selectedValue={period}
              onValueChange={setPeriod}
              style={styles.picker}>
              {Array.from({length: courseType === 'pu' ? 3 : 8}, (_, i) => (
                <Picker.Item key={i + 1} label={`Period ${i + 1}`} value={i + 1} />
              ))}
            </Picker>
          </View>
        </Card.Content>
      </Card>

      {/* Students List */}
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

          <FlatList
            data={students}
            renderItem={renderStudentCard}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />

          <View style={styles.saveContainer}>
            <Button
              mode="contained"
              onPress={handleSaveAttendance}
              loading={saveAttendanceMutation.isPending}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}>
              Save Attendance
            </Button>
          </View>
        </>
      ) : (
        <Card style={styles.noStudentsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.noStudentsText}>
              No students found for the selected class configuration
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
          {value: 'take', label: 'Take Attendance'},
          {value: 'sheet', label: 'Attendance Sheet'},
          {value: 'missed', label: 'Missed Sections'},
        ]}
        style={styles.segmentedButtons}
      />

      {activeTab === 'take' && takeAttendanceTab()}
      {activeTab === 'sheet' && (
        <View style={styles.placeholderContainer}>
          <Text variant="titleMedium">Attendance Sheet View</Text>
          <Text variant="bodyMedium">Coming soon...</Text>
        </View>
      )}
      {activeTab === 'missed' && (
        <View style={styles.placeholderContainer}>
          <Text variant="titleMedium">Missed Sections Management</Text>
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
    marginBottom: 12,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    marginBottom: 4,
    color: theme.colors.onSurface,
  },
  picker: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
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

export default AttendanceScreen;