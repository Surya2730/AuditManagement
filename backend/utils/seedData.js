import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditCategory from '../models/AuditCategory.js';
import Building from '../models/Building.js';
import Assignment from '../models/Assignment.js';
import AuditResponse from '../models/AuditResponse.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';

dotenv.config();

const defaultChecklist = [
  { questionId: 'q1', text: 'Are the fire extinguishers present and within expiry?', type: 'Yes/No', mandatory: true, weightage: 2 },
  { questionId: 'q2', text: 'Is the room clean, organized and free of debris?', type: 'Yes/No', mandatory: true, weightage: 1 },
  { questionId: 'q3', text: 'Condition of electrical wiring and switch boards:', type: 'Dropdown', options: ['Excellent', 'Good', 'Needs Repair', 'Hazardous'], mandatory: true, weightage: 2 },
  { questionId: 'q4', text: 'Condition of ventilation and lighting:', type: 'Rating', mandatory: false, weightage: 1 },
  { questionId: 'q5', text: 'Upload photo of the overall room condition:', type: 'Image', mandatory: true, weightage: 1 },
  { questionId: 'q6', text: 'General remarks or issues identified:', type: 'Text', mandatory: false, weightage: 1 }
];

const categoryNames = [
  'Hostel', 'Laboratory', 'Library', 'Classroom', 'Seminar Hall',
  'COE Hall', 'Office', 'Staff Quarters', 'Sports Complex', 'Cafeteria',
  'Parking', 'Bus Bay', 'Washroom', 'Electrical Room', 'Server Room',
  'Chemistry Lab', 'Physics Lab', 'Computer Lab', 'Workshop', 'Drawing Hall',
  'Auditorium', 'Gym', 'Medical Room', 'Principal Office', 'Reception',
  'Placement Cell', 'Exam Cell', 'Record Room', 'IQAC Room', 'Water Tank RO Plant',
  'Generator Room', 'Solar Power Site', 'Security Cabin', 'Store Room', 'Fire Station',
  'Gardens'
];

const buildingsSeed = [
  {
    name: 'Main Block',
    campus: 'Main Campus',
    latitude: 12.971598,
    longitude: 77.594562,
    radius: 60,
    rooms: [
      { roomNumber: 'LH-101', block: 'Block A', floor: '1st Floor', roomType: 'Classroom', qrCode: 'ROOM_VERIFY_Main_Block_LH-101' },
      { roomNumber: 'LH-102', block: 'Block A', floor: '1st Floor', roomType: 'Classroom', qrCode: 'ROOM_VERIFY_Main_Block_LH-102' },
      { roomNumber: 'PR-100', block: 'Block A', floor: 'Ground Floor', roomType: 'Principal Office', qrCode: 'ROOM_VERIFY_Main_Block_PR-100' },
      { roomNumber: 'EL-001', block: 'Block B', floor: 'Ground Floor', roomType: 'Electrical Room', qrCode: 'ROOM_VERIFY_Main_Block_EL-001' }
    ]
  },
  {
    name: 'Science & Lab Complex',
    campus: 'Main Campus',
    latitude: 12.972300,
    longitude: 77.595100,
    radius: 75,
    rooms: [
      { roomNumber: 'LAB-201', block: 'Block C', floor: '2nd Floor', roomType: 'Chemistry Lab', qrCode: 'ROOM_VERIFY_Science_Complex_LAB-201' },
      { roomNumber: 'LAB-202', block: 'Block C', floor: '2nd Floor', roomType: 'Physics Lab', qrCode: 'ROOM_VERIFY_Science_Complex_LAB-202' },
      { roomNumber: 'SR-301', block: 'Block D', floor: '3rd Floor', roomType: 'Server Room', qrCode: 'ROOM_VERIFY_Science_Complex_SR-301' }
    ]
  },
  {
    name: 'Central Library Building',
    campus: 'Main Campus',
    latitude: 12.971200,
    longitude: 77.594000,
    radius: 50,
    rooms: [
      { roomNumber: 'LIB-MAIN', block: 'Central Block', floor: '1st & 2nd Floor', roomType: 'Library', qrCode: 'ROOM_VERIFY_Library_LIB-MAIN' },
      { roomNumber: 'RD-101', block: 'Central Block', floor: 'Ground Floor', roomType: 'Record Room', qrCode: 'ROOM_VERIFY_Library_RD-101' }
    ]
  }
];

const seedData = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected.');

    // Clear existing data
    await User.deleteMany({});
    await AuditCategory.deleteMany({});
    await Building.deleteMany({});
    await Assignment.deleteMany({});
    await AuditResponse.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});

    console.log('Cleared existing collections.');

    // Create default users
    const salt = await bcrypt.genSalt(10);
    
    const usersToCreate = [
      {
        username: 'superadmin',
        email: 'superadmin@mit.edu.in',
        password: 'password', // will be hashed by mongoose pre-save hook
        role: 'Super Admin',
        profile: { fullName: 'Dr. Surya Kumar (Director)', designation: 'Director', department: 'Administration', phone: '9876543210' }
      },
      {
        username: 'admin',
        email: 'admin@mit.edu.in',
        password: 'password',
        role: 'Admin',
        profile: { fullName: 'Prof. Ramesh Sen (Registrar)', designation: 'Registrar', department: 'Academic Cell', phone: '9876543211' }
      },
      {
        username: 'auditor',
        email: 'auditor@mit.edu.in',
        password: 'password',
        role: 'Auditor',
        profile: { fullName: 'Mr. Anil Mehta (Estate Officer)', designation: 'Estate Inspector', department: 'Maintenance Dept', phone: '9876543212' }
      },
      {
        username: 'viewer',
        email: 'viewer@mit.edu.in',
        password: 'password',
        role: 'Viewer',
        profile: { fullName: 'Dr. Priya Shah (IQAC Coordinator)', designation: 'IQAC Head', department: 'Quality Assurance', phone: '9876543213' }
      }
    ];

    const createdUsers = await User.create(usersToCreate);
    console.log(`Created ${createdUsers.length} seed users.`);

    const adminUser = createdUsers.find(u => u.role === 'Admin');

    // Create Audit Categories
    const categoriesToCreate = categoryNames.map(name => {
      let checklist = [...defaultChecklist];
      
      // Customize Server Room specifically
      if (name === 'Server Room') {
        checklist = [
          { questionId: 'q1', text: 'Is Server room temperature below 20 degrees Celsius?', type: 'Yes/No', mandatory: true, weightage: 3 },
          { questionId: 'q2', text: 'Are server racks grounded and cable layouts structured?', type: 'Yes/No', mandatory: true, weightage: 2 },
          { questionId: 'q3', text: 'Condition of redundant Online UPS backup:', type: 'Dropdown', options: ['Normal Dual Source', 'Single Source Active', 'On Battery Mode', 'Faulty Backup'], mandatory: true, weightage: 3 },
          { questionId: 'q4', text: 'Rate cleanliness / dust levels inside Server room:', type: 'Rating', mandatory: false, weightage: 1 },
          { questionId: 'q5', text: 'Upload photo of Rack A status lights:', type: 'Image', mandatory: true, weightage: 1 }
        ];
      }
      return {
        name,
        description: `Infrastructure and checklist parameters for auditing ${name} facility.`,
        checklist,
        createdBy: adminUser._id
      };
    });

    const createdCategories = await AuditCategory.create(categoriesToCreate);
    console.log(`Created ${createdCategories.length} audit categories.`);

    // Create Buildings
    const createdBuildings = await Building.create(buildingsSeed);
    console.log(`Created ${createdBuildings.length} buildings and connected rooms.`);

    // Create 1 Sample Assignment
    const mainBuilding = createdBuildings[0];
    const serverCategory = createdCategories.find(c => c.name === 'Server Room');
    const auditorUser = createdUsers.find(u => u.role === 'Auditor');

    const scheduledDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const assignment = await Assignment.create({
      building: mainBuilding._id,
      roomNumber: 'EL-001',
      category: serverCategory._id,
      auditor: auditorUser._id,
      scheduledDate,
      dueDate,
      status: 'Pending',
      assignedBy: adminUser._id,
      remarks: 'Please audit the critical main power junction panel and UPS wiring setups.'
    });

    console.log(`Created seed assignment ID: ${assignment._id}`);

    // Create activity logs
    await ActivityLog.create({
      user: adminUser._id,
      action: 'SEED_DATABASE',
      details: 'Populated initial seed system configuration parameters successfully.',
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script'
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
