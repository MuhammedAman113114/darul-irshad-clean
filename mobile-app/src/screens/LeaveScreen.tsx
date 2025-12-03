import React, {useState} from 'react';
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
  TextInput,
  ActivityIndicator,
  Chip,
  FAB,
  Modal,
  Portal,
} from 'react-native-paper';
import {Picker} from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {studentsAPI, leaveAPI} from '../services/api';
import {theme} from '../theme/theme';

const LeaveScreen = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const queryClient = useQueryClient();

  // Get all students
  const {data: students = [], isLoading: studentsLoading} = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsAPI.getStudents(),
  });

  // Get all leaves
  const {data: leaves = [], isLoading: leavesLoading} = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leaveAPI.getLeaves(),
  });

  // Create leave mutation
  const createLeaveMutation = useMutation({
    mutationFn: (data: any) => leaveAPI.createLeave(data),
    onSuccess: () => {
      Alert.alert('Success', 'Leave request created successfully!');
      queryClient.invalidateQueries({queryKey: ['leaves']});
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create leave request');
    },
  });

  // Delete leave mutation
  const deleteLeaveMutation = useMutation({
    mutationFn: (id: number) => leaveAPI.deleteLeave(id),
    onSuccess: () => {
      Alert.alert('Success', 'Leave request deleted successfully!');
      queryClient.invalidateQueries({queryKey: ['leaves']});
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete leave request');
    },
  });

  const resetForm = () => {
    setSelectedStudent(null);
    setFromDate(new Date());
    setToDate(new Date());
    setReason('');
  };

  const handleCreateLeave = () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter a reason for the leave');
      return;
    }

    if (fromDate > toDate) {
      Alert.alert('Error', 'From date cannot be after to date');
      return;
    }

    const leaveData = {
      studentId: selectedStudent.id,
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      reason: reason.trim(),
    };

    createLeaveMutation.mutate(leaveData);
  };

  const handleDeleteLeave = (leaveId: number) => {
    Alert.alert(
      'Delete Leave',
      'Are you sure you want to delete this leave request?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLeaveMutation.mutate(leaveId),
        },
      ]
    );
  };

  const getStudentName = (studentId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const renderLeaveCard = ({item}: {item: any}) => {
    const student = students.find((s: any) => s.id === item.studentId);
    const duration = Math.ceil(
      (new Date(item.toDate).getTime() - new Date(item.fromDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    return (
      <Card style={styles.leaveCard}>
        <Card.Content>
          <View style={styles.leaveHeader}>
            <View style={styles.leaveInfo}>
              <Text variant="titleMedium" style={styles.studentName}>
                {getStudentName(item.studentId)}
              </Text>
              {student && (
                <Text variant="bodySmall" style={styles.studentDetails}>
                  Roll No: {student.rollNo} | {student.courseType.toUpperCase()} {student.year}
                  {student.courseDivision && ` ${student.courseDivision.charAt(0).toUpperCase() + student.courseDivision.slice(1)}`}
                  {student.batch && ` - Section ${student.batch}`}
                </Text>
              )}
            </View>
            <Chip
              mode="outlined"
              style={[styles.statusChip, item.status === 'active' ? styles.activeChip : styles.completedChip]}>
              {item.status}
            </Chip>
          </View>

          <View style={styles.leaveDates}>
            <Text variant="bodyMedium" style={styles.dateText}>
              <Text style={styles.dateLabel}>From: </Text>
              {new Date(item.fromDate).toLocaleDateString()}
            </Text>
            <Text variant="bodyMedium" style={styles.dateText}>
              <Text style={styles.dateLabel}>To: </Text>
              {new Date(item.toDate).toLocaleDateString()}
            </Text>
            <Text variant="bodyMedium" style={styles.durationText}>
              Duration: {duration} day{duration > 1 ? 's' : ''}
            </Text>
          </View>

          <Text variant="bodyMedium" style={styles.reasonText}>
            <Text style={styles.reasonLabel}>Reason: </Text>
            {item.reason}
          </Text>

          <View style={styles.leaveActions}>
            <Button
              mode="outlined"
              onPress={() => handleDeleteLeave(item.id)}
              style={styles.deleteButton}
              textColor={theme.colors.error}>
              Delete
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {leavesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading leave requests...</Text>
        </View>
      ) : leaves.length > 0 ? (
        <FlatList
          data={leaves}
          renderItem={renderLeaveCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyText}>
            No leave requests found
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Tap the + button to create a new leave request
          </Text>
        </View>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      />

      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={styles.modalContainer}>
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Create Leave Request
            </Text>

            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Select Student:
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedStudent?.id || ''}
                onValueChange={(value) => {
                  const student = students.find((s: any) => s.id === value);
                  setSelectedStudent(student || null);
                }}
                style={styles.picker}>
                <Picker.Item label="Choose student..." value="" />
                {students.map((student: any) => (
                  <Picker.Item
                    key={student.id}
                    label={`${student.name} (${student.rollNo})`}
                    value={student.id}
                  />
                ))}
              </Picker>
            </View>

            <Text variant="bodyMedium" style={styles.fieldLabel}>
              From Date:
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowFromDatePicker(true)}
              style={styles.dateButton}>
              {fromDate.toLocaleDateString()}
            </Button>

            <Text variant="bodyMedium" style={styles.fieldLabel}>
              To Date:
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowToDatePicker(true)}
              style={styles.dateButton}>
              {toDate.toLocaleDateString()}
            </Button>

            <TextInput
              label="Reason for leave"
              value={reason}
              onChangeText={setReason}
              style={styles.reasonInput}
              mode="outlined"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowCreateModal(false)}
                style={styles.cancelButton}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateLeave}
                loading={createLeaveMutation.isPending}
                style={styles.createButton}>
                Create Leave
              </Button>
            </View>
          </ScrollView>

          <DatePicker
            modal
            open={showFromDatePicker}
            date={fromDate}
            mode="date"
            onConfirm={(date) => {
              setShowFromDatePicker(false);
              setFromDate(date);
            }}
            onCancel={() => setShowFromDatePicker(false)}
          />

          <DatePicker
            modal
            open={showToDatePicker}
            date={toDate}
            mode="date"
            onConfirm={(date) => {
              setShowToDatePicker(false);
              setToDate(date);
            }}
            onCancel={() => setShowToDatePicker(false)}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: theme.colors.outline,
  },
  leaveCard: {
    marginBottom: 12,
    elevation: 2,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leaveInfo: {
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
  statusChip: {
    marginLeft: 8,
  },
  activeChip: {
    backgroundColor: theme.colors.successContainer,
  },
  completedChip: {
    backgroundColor: theme.colors.outline,
  },
  leaveDates: {
    marginBottom: 12,
  },
  dateText: {
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  dateLabel: {
    fontWeight: 'bold',
  },
  durationText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  reasonText: {
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  reasonLabel: {
    fontWeight: 'bold',
  },
  leaveActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  fieldLabel: {
    marginBottom: 8,
    marginTop: 12,
    color: theme.colors.onSurface,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    height: 50,
  },
  dateButton: {
    marginBottom: 12,
  },
  reasonInput: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  createButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.colors.primary,
  },
});

export default LeaveScreen;