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
  Searchbar,
} from 'react-native-paper';
import {Picker} from '@react-native-picker/picker';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {studentsAPI} from '../services/api';
import {theme} from '../theme/theme';

const StudentsScreen = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    courseType: 'pu',
    courseDivision: 'commerce',
    year: '1',
    batch: 'A',
    dob: '',
    bloodGroup: '',
    fatherName: '',
    motherName: '',
    contact1: '',
    contact2: '',
    address: '',
  });

  const queryClient = useQueryClient();

  // Get all students
  const {data: students = [], isLoading: studentsLoading} = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsAPI.getStudents(),
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: (data: any) => studentsAPI.createStudent(data),
    onSuccess: () => {
      Alert.alert('Success', 'Student created successfully!');
      queryClient.invalidateQueries({queryKey: ['students']});
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create student');
    },
  });

  const resetForm = () => {
    setNewStudent({
      name: '',
      rollNo: '',
      courseType: 'pu',
      courseDivision: 'commerce',
      year: '1',
      batch: 'A',
      dob: '',
      bloodGroup: '',
      fatherName: '',
      motherName: '',
      contact1: '',
      contact2: '',
      address: '',
    });
  };

  const handleCreateStudent = () => {
    if (!newStudent.name.trim() || !newStudent.rollNo.trim()) {
      Alert.alert('Error', 'Please enter student name and roll number');
      return;
    }

    const studentData = {
      ...newStudent,
      name: newStudent.name.trim(),
      rollNo: newStudent.rollNo.trim(),
      courseDivision: newStudent.courseType === 'post-pu' ? null : newStudent.courseDivision,
      batch: newStudent.courseType === 'post-pu' || newStudent.courseDivision === 'science' ? null : newStudent.batch,
    };

    createStudentMutation.mutate(studentData);
  };

  const filteredStudents = students.filter((student: any) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudentCard = ({item}: {item: any}) => (
    <Card style={styles.studentCard}>
      <Card.Content>
        <View style={styles.studentHeader}>
          <View style={styles.studentInfo}>
            <Text variant="titleMedium" style={styles.studentName}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.studentDetails}>
              Roll No: {item.rollNo}
            </Text>
          </View>
          <Chip mode="outlined" style={styles.courseChip}>
            {item.courseType.toUpperCase()} {item.year}
          </Chip>
        </View>

        <View style={styles.studentMeta}>
          <Text variant="bodySmall" style={styles.metaText}>
            <Text style={styles.metaLabel}>Course: </Text>
            {item.courseType.toUpperCase()} {item.year}
            {item.courseDivision && ` ${item.courseDivision.charAt(0).toUpperCase() + item.courseDivision.slice(1)}`}
            {item.batch && ` - Section ${item.batch}`}
          </Text>
          
          {item.dob && (
            <Text variant="bodySmall" style={styles.metaText}>
              <Text style={styles.metaLabel}>DOB: </Text>
              {item.dob}
            </Text>
          )}
          
          {item.bloodGroup && (
            <Text variant="bodySmall" style={styles.metaText}>
              <Text style={styles.metaLabel}>Blood Group: </Text>
              {item.bloodGroup}
            </Text>
          )}
          
          {item.fatherName && (
            <Text variant="bodySmall" style={styles.metaText}>
              <Text style={styles.metaLabel}>Father: </Text>
              {item.fatherName}
            </Text>
          )}
          
          {item.contact1 && (
            <Text variant="bodySmall" style={styles.metaText}>
              <Text style={styles.metaLabel}>Contact: </Text>
              {item.contact1}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search students..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {studentsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading students...</Text>
        </View>
      ) : filteredStudents.length > 0 ? (
        <>
          <Text variant="bodyMedium" style={styles.resultsCount}>
            Showing {filteredStudents.length} of {students.length} students
          </Text>
          <FlatList
            data={filteredStudents}
            renderItem={renderStudentCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
          />
        </>
      ) : searchQuery ? (
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyText}>
            No students found for "{searchQuery}"
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Try a different search term
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyText}>
            No students found
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Tap the + button to add a new student
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
              Add New Student
            </Text>

            <TextInput
              label="Student Name *"
              value={newStudent.name}
              onChangeText={(text) => setNewStudent(prev => ({...prev, name: text}))}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Roll Number *"
              value={newStudent.rollNo}
              onChangeText={(text) => setNewStudent(prev => ({...prev, rollNo: text}))}
              style={styles.input}
              mode="outlined"
            />

            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Course Type:
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newStudent.courseType}
                onValueChange={(value) => setNewStudent(prev => ({...prev, courseType: value}))}
                style={styles.picker}>
                <Picker.Item label="PU College" value="pu" />
                <Picker.Item label="Post-PU" value="post-pu" />
              </Picker>
            </View>

            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Year:
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newStudent.year}
                onValueChange={(value) => setNewStudent(prev => ({...prev, year: value}))}
                style={styles.picker}>
                {newStudent.courseType === 'pu' ? (
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

            {newStudent.courseType === 'pu' && (
              <>
                <Text variant="bodyMedium" style={styles.fieldLabel}>
                  Division:
                </Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newStudent.courseDivision}
                    onValueChange={(value) => setNewStudent(prev => ({...prev, courseDivision: value}))}
                    style={styles.picker}>
                    <Picker.Item label="Commerce" value="commerce" />
                    <Picker.Item label="Science" value="science" />
                  </Picker>
                </View>

                {newStudent.courseDivision === 'commerce' && (
                  <>
                    <Text variant="bodyMedium" style={styles.fieldLabel}>
                      Section:
                    </Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={newStudent.batch}
                        onValueChange={(value) => setNewStudent(prev => ({...prev, batch: value}))}
                        style={styles.picker}>
                        <Picker.Item label="Section A" value="A" />
                        <Picker.Item label="Section B" value="B" />
                      </Picker>
                    </View>
                  </>
                )}
              </>
            )}

            <TextInput
              label="Date of Birth (YYYY-MM-DD)"
              value={newStudent.dob}
              onChangeText={(text) => setNewStudent(prev => ({...prev, dob: text}))}
              style={styles.input}
              mode="outlined"
              placeholder="1995-01-15"
            />

            <TextInput
              label="Blood Group"
              value={newStudent.bloodGroup}
              onChangeText={(text) => setNewStudent(prev => ({...prev, bloodGroup: text}))}
              style={styles.input}
              mode="outlined"
              placeholder="A+, B-, O+, etc."
            />

            <TextInput
              label="Father's Name"
              value={newStudent.fatherName}
              onChangeText={(text) => setNewStudent(prev => ({...prev, fatherName: text}))}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Mother's Name"
              value={newStudent.motherName}
              onChangeText={(text) => setNewStudent(prev => ({...prev, motherName: text}))}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Contact Number 1"
              value={newStudent.contact1}
              onChangeText={(text) => setNewStudent(prev => ({...prev, contact1: text}))}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
            />

            <TextInput
              label="Contact Number 2"
              value={newStudent.contact2}
              onChangeText={(text) => setNewStudent(prev => ({...prev, contact2: text}))}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
            />

            <TextInput
              label="Address"
              value={newStudent.address}
              onChangeText={(text) => setNewStudent(prev => ({...prev, address: text}))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
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
                onPress={handleCreateStudent}
                loading={createStudentMutation.isPending}
                style={styles.createButton}>
                Add Student
              </Button>
            </View>
          </ScrollView>
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
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  resultsCount: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: theme.colors.outline,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
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
  studentCard: {
    marginBottom: 12,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  courseChip: {
    marginLeft: 8,
  },
  studentMeta: {
    gap: 4,
  },
  metaText: {
    color: theme.colors.onSurface,
  },
  metaLabel: {
    fontWeight: 'bold',
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
    maxHeight: '90%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  input: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 8,
    marginTop: 8,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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

export default StudentsScreen;