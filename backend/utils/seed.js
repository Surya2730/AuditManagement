/**
 * Seed Script - Bannari Amman Institute of Technology
 * Seeds 5 campus locations with location-specific checklists, 1 Admin, and sample Auditors.
 * 
 * Run: node backend/utils/seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Location from '../models/Location.js';
import Assignment from '../models/Assignment.js';
import AuditResponse from '../models/AuditResponse.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import GPSLog from '../models/GPSLog.js';

// BIT Campus GPS coordinates (Sathyamangalam, Tamil Nadu)
// Approximate coordinates for Bannari Amman Institute of Technology
const BIT_LAT = 11.5031;
const BIT_LON = 77.3301;

const LOCATIONS = [
  {
    name: 'Medical Center',
    code: 'BIT-MC',
    description: 'Campus Medical Center and First Aid facility',
    building: 'Health Sciences Block',
    floor: 'Ground Floor',
    latitude: BIT_LAT + 0.001,
    longitude: BIT_LON + 0.002,
    radius: 80,
    checklist: [
      // Infrastructure
      { questionId: 'mc-01', question: 'Is the Medical Center accessible 24/7?', type: 'Yes/No', weightage: 2, category: 'Accessibility', isRequired: true },
      { questionId: 'mc-02', question: 'Is the reception desk staffed during working hours?', type: 'Yes/No', weightage: 2, category: 'Staffing', isRequired: true },
      { questionId: 'mc-03', question: 'Is a qualified doctor available?', type: 'Yes/No', weightage: 3, category: 'Staffing', isRequired: true },
      { questionId: 'mc-04', question: 'Is a qualified nurse available?', type: 'Yes/No', weightage: 2, category: 'Staffing', isRequired: true },
      // Facilities
      { questionId: 'mc-05', question: 'Is the first-aid kit fully stocked?', type: 'Yes/No', weightage: 3, category: 'Medical Supplies', isRequired: true },
      { questionId: 'mc-06', question: 'Are emergency medicines available?', type: 'Yes/No', weightage: 3, category: 'Medical Supplies', isRequired: true },
      { questionId: 'mc-07', question: 'Is the BP monitor in working condition?', type: 'Yes/No', weightage: 2, category: 'Equipment', isRequired: true },
      { questionId: 'mc-08', question: 'Is the ECG machine operational?', type: 'Yes/No', weightage: 2, category: 'Equipment', isRequired: false },
      { questionId: 'mc-09', question: 'Is the oxygen cylinder with regulator available?', type: 'Yes/No', weightage: 3, category: 'Emergency Equipment', isRequired: true },
      { questionId: 'mc-10', question: 'Is the stretcher in good condition?', type: 'Yes/No', weightage: 2, category: 'Emergency Equipment', isRequired: true },
      { questionId: 'mc-11', question: 'Are patient beds clean and made properly?', type: 'Yes/No', weightage: 1, category: 'Hygiene', isRequired: true },
      { questionId: 'mc-12', question: 'Is the sanitization schedule maintained?', type: 'Yes/No', weightage: 2, category: 'Hygiene', isRequired: true },
      { questionId: 'mc-13', question: 'Is the medical waste disposed properly?', type: 'Yes/No', weightage: 2, category: 'Hygiene', isRequired: true },
      { questionId: 'mc-14', question: 'Rate the overall cleanliness of the facility', type: 'Rating', weightage: 2, category: 'Hygiene', isRequired: true },
      { questionId: 'mc-15', question: 'Is the ambulance/transport arrangement documented?', type: 'Yes/No', weightage: 2, category: 'Emergency Protocols', isRequired: true },
      { questionId: 'mc-16', question: 'Are emergency contact numbers displayed visibly?', type: 'Yes/No', weightage: 1, category: 'Emergency Protocols', isRequired: true },
      { questionId: 'mc-17', question: 'Additional remarks or observations', type: 'Text', weightage: 0, category: 'Remarks', isRequired: false },
    ],
  },
  {
    name: 'A1 Guest House',
    code: 'BIT-GH',
    description: 'Campus Guest House facility for visitors and official guests',
    building: 'Administrative Block - A1',
    floor: 'Ground & First Floor',
    latitude: BIT_LAT - 0.001,
    longitude: BIT_LON + 0.003,
    radius: 80,
    checklist: [
      { questionId: 'gh-01', question: 'Is the main entrance secure and accessible?', type: 'Yes/No', weightage: 2, category: 'Security', isRequired: true },
      { questionId: 'gh-02', question: 'Is a caretaker available during check-in hours?', type: 'Yes/No', weightage: 2, category: 'Staffing', isRequired: true },
      { questionId: 'gh-03', question: 'Is the reception register up to date?', type: 'Yes/No', weightage: 1, category: 'Administration', isRequired: true },
      { questionId: 'gh-04', question: 'Are all rooms clean and properly arranged?', type: 'Yes/No', weightage: 2, category: 'Housekeeping', isRequired: true },
      { questionId: 'gh-05', question: 'Are bed linens and towels freshly laundered?', type: 'Yes/No', weightage: 2, category: 'Housekeeping', isRequired: true },
      { questionId: 'gh-06', question: 'Are bathrooms clean and hygienic?', type: 'Yes/No', weightage: 2, category: 'Housekeeping', isRequired: true },
      { questionId: 'gh-07', question: 'Is hot water supply available?', type: 'Yes/No', weightage: 2, category: 'Utilities', isRequired: true },
      { questionId: 'gh-08', question: 'Is the AC/fan system functional in all rooms?', type: 'Yes/No', weightage: 2, category: 'Utilities', isRequired: true },
      { questionId: 'gh-09', question: 'Is Wi-Fi connectivity available and functional?', type: 'Yes/No', weightage: 1, category: 'Utilities', isRequired: true },
      { questionId: 'gh-10', question: 'Is the dining/pantry area clean?', type: 'Yes/No', weightage: 2, category: 'Dining', isRequired: true },
      { questionId: 'gh-11', question: 'Are electrical fittings (sockets, lights) in good condition?', type: 'Yes/No', weightage: 2, category: 'Electrical', isRequired: true },
      { questionId: 'gh-12', question: 'Is the fire extinguisher available and charged?', type: 'Yes/No', weightage: 3, category: 'Safety', isRequired: true },
      { questionId: 'gh-13', question: 'Is the fire exit clearly marked and unobstructed?', type: 'Yes/No', weightage: 2, category: 'Safety', isRequired: true },
      { questionId: 'gh-14', question: 'Rate the overall maintenance level of the Guest House', type: 'Rating', weightage: 3, category: 'General', isRequired: true },
      { questionId: 'gh-15', question: 'Additional remarks or observations', type: 'Text', weightage: 0, category: 'Remarks', isRequired: false },
    ],
  },
  {
    name: 'Community Radio Station',
    code: 'BIT-CRS',
    description: 'Campus Community Radio Station (90.8 MHz)',
    building: 'Media Arts Block',
    floor: 'Third Floor',
    latitude: BIT_LAT + 0.002,
    longitude: BIT_LON - 0.001,
    radius: 60,
    checklist: [
      { questionId: 'crs-01', question: 'Is the studio broadcasting equipment in working order?', type: 'Yes/No', weightage: 3, category: 'Equipment', isRequired: true },
      { questionId: 'crs-02', question: 'Is the transmission system operational?', type: 'Yes/No', weightage: 3, category: 'Equipment', isRequired: true },
      { questionId: 'crs-03', question: 'Is the microphone and mixing console functional?', type: 'Yes/No', weightage: 2, category: 'Equipment', isRequired: true },
      { questionId: 'crs-04', question: 'Is the recording software operational?', type: 'Yes/No', weightage: 2, category: 'Software', isRequired: true },
      { questionId: 'crs-05', question: 'Are audio archives organized and backed up?', type: 'Yes/No', weightage: 2, category: 'Content Management', isRequired: true },
      { questionId: 'crs-06', question: 'Is the broadcast schedule displayed and followed?', type: 'Yes/No', weightage: 2, category: 'Operations', isRequired: true },
      { questionId: 'crs-07', question: 'Is the studio soundproofing adequate?', type: 'Yes/No', weightage: 2, category: 'Infrastructure', isRequired: true },
      { questionId: 'crs-08', question: 'Are air conditioner/ventilation systems working?', type: 'Yes/No', weightage: 1, category: 'Infrastructure', isRequired: true },
      { questionId: 'crs-09', question: 'Is the UPS/power backup system available and charged?', type: 'Yes/No', weightage: 3, category: 'Power Backup', isRequired: true },
      { questionId: 'crs-10', question: 'Is the antenna/transmitter checked for damage?', type: 'Yes/No', weightage: 3, category: 'Equipment', isRequired: true },
      { questionId: 'crs-11', question: 'Is the LICENSOR compliance register updated?', type: 'Yes/No', weightage: 2, category: 'Compliance', isRequired: true },
      { questionId: 'crs-12', question: 'Are student volunteers trained and scheduled?', type: 'Yes/No', weightage: 1, category: 'Staffing', isRequired: true },
      { questionId: 'crs-13', question: 'Rate overall equipment condition and readiness', type: 'Rating', weightage: 3, category: 'General', isRequired: true },
      { questionId: 'crs-14', question: 'Additional remarks or technical observations', type: 'Text', weightage: 0, category: 'Remarks', isRequired: false },
    ],
  },
  {
    name: 'Research and Development',
    code: 'BIT-RD',
    description: 'Research & Development Center including advanced research labs',
    building: 'R&D Block',
    floor: 'Multiple Floors',
    latitude: BIT_LAT - 0.002,
    longitude: BIT_LON - 0.002,
    radius: 100,
    checklist: [
      { questionId: 'rd-01', question: 'Are all research labs locked and access controlled?', type: 'Yes/No', weightage: 3, category: 'Security', isRequired: true },
      { questionId: 'rd-02', question: 'Is the lab register/entry log maintained?', type: 'Yes/No', weightage: 2, category: 'Administration', isRequired: true },
      { questionId: 'rd-03', question: 'Are research instruments calibrated and tagged?', type: 'Yes/No', weightage: 3, category: 'Equipment', isRequired: true },
      { questionId: 'rd-04', question: 'Is the chemical storage room properly secured and labeled?', type: 'Yes/No', weightage: 3, category: 'Safety', isRequired: true },
      { questionId: 'rd-05', question: 'Are hazardous material disposal protocols followed?', type: 'Yes/No', weightage: 3, category: 'Safety', isRequired: true },
      { questionId: 'rd-06', question: 'Is the fume hood/exhaust system operational?', type: 'Yes/No', weightage: 3, category: 'Safety', isRequired: true },
      { questionId: 'rd-07', question: 'Are fire extinguishers present and inspected?', type: 'Yes/No', weightage: 3, category: 'Fire Safety', isRequired: true },
      { questionId: 'rd-08', question: 'Is the high-speed internet connectivity available for research?', type: 'Yes/No', weightage: 2, category: 'IT Infrastructure', isRequired: true },
      { questionId: 'rd-09', question: 'Are research servers and storage systems operational?', type: 'Yes/No', weightage: 2, category: 'IT Infrastructure', isRequired: true },
      { questionId: 'rd-10', question: 'Is data backup performed regularly?', type: 'Yes/No', weightage: 2, category: 'IT Infrastructure', isRequired: true },
      { questionId: 'rd-11', question: 'Are ongoing project documents and patents secured?', type: 'Yes/No', weightage: 2, category: 'Documentation', isRequired: true },
      { questionId: 'rd-12', question: 'Is the CCTV system operational in all labs?', type: 'Yes/No', weightage: 2, category: 'Security', isRequired: true },
      { questionId: 'rd-13', question: 'Are first-aid kits available in all research labs?', type: 'Yes/No', weightage: 2, category: 'Safety', isRequired: true },
      { questionId: 'rd-14', question: 'Are lab maintenance schedules documented and up to date?', type: 'Yes/No', weightage: 1, category: 'Administration', isRequired: true },
      { questionId: 'rd-15', question: 'Rate overall research facility infrastructure quality', type: 'Rating', weightage: 3, category: 'General', isRequired: true },
      { questionId: 'rd-16', question: 'Additional remarks or observations', type: 'Text', weightage: 0, category: 'Remarks', isRequired: false },
    ],
  },
  {
    name: 'Controller of Examinations',
    code: 'BIT-COE',
    description: 'Examination Control Office and Confidential Material Store',
    building: 'Administrative Block - C Wing',
    floor: 'Second Floor',
    latitude: BIT_LAT + 0.0005,
    longitude: BIT_LON + 0.001,
    radius: 60,
    checklist: [
      { questionId: 'coe-01', question: 'Is the COE office secured and access-controlled?', type: 'Yes/No', weightage: 3, category: 'Security', isRequired: true },
      { questionId: 'coe-02', question: 'Is the confidential material store locked with dual-key access?', type: 'Yes/No', weightage: 3, category: 'Security', isRequired: true },
      { questionId: 'coe-03', question: 'Are question paper packets sealed and accounted for?', type: 'Yes/No', weightage: 3, category: 'Examination Material', isRequired: true },
      { questionId: 'coe-04', question: 'Is the strong room CCTV operational and recording?', type: 'Yes/No', weightage: 3, category: 'Security', isRequired: true },
      { questionId: 'coe-05', question: 'Is the answer script storage organized and indexed?', type: 'Yes/No', weightage: 2, category: 'Documentation', isRequired: true },
      { questionId: 'coe-06', question: 'Is the hall ticket generation system functional?', type: 'Yes/No', weightage: 2, category: 'IT Systems', isRequired: true },
      { questionId: 'coe-07', question: 'Is the exam schedule displayed on notice boards?', type: 'Yes/No', weightage: 1, category: 'Communication', isRequired: true },
      { questionId: 'coe-08', question: 'Is the exam attendance register maintained?', type: 'Yes/No', weightage: 2, category: 'Records', isRequired: true },
      { questionId: 'coe-09', question: 'Are unfair means (UFM) registers maintained?', type: 'Yes/No', weightage: 2, category: 'Records', isRequired: true },
      { questionId: 'coe-10', question: 'Is the server room for exam data access-controlled?', type: 'Yes/No', weightage: 3, category: 'IT Systems', isRequired: true },
      { questionId: 'coe-11', question: 'Are exam results securely stored and access-restricted?', type: 'Yes/No', weightage: 3, category: 'IT Systems', isRequired: true },
      { questionId: 'coe-12', question: 'Is the stationery stock (papers, OMR sheets) inventoried?', type: 'Yes/No', weightage: 2, category: 'Inventory', isRequired: true },
      { questionId: 'coe-13', question: 'Are seating arrangement charts prepared and verified?', type: 'Yes/No', weightage: 2, category: 'Examination Operations', isRequired: true },
      { questionId: 'coe-14', question: 'Is the invigilation duty chart published and acknowledged?', type: 'Yes/No', weightage: 2, category: 'Examination Operations', isRequired: true },
      { questionId: 'coe-15', question: 'Rate overall readiness and compliance of the examination office', type: 'Rating', weightage: 3, category: 'General', isRequired: true },
      { questionId: 'coe-16', question: 'Additional remarks or compliance notes', type: 'Text', weightage: 0, category: 'Remarks', isRequired: false },
    ],
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected for Seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Location.deleteMany({});
    await Assignment.deleteMany({});
    await AuditResponse.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await GPSLog.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Locations
    const createdLocations = await Location.insertMany(LOCATIONS);
    console.log(`📍 Created ${createdLocations.length} campus locations`);

    // Create Admin User
    const adminUser = await User.create({
      username: 'bit_admin',
      email: 'admin@bitsathy.ac.in',
      password: 'Admin@BIT2025',
      role: 'Admin',
      profile: {
        fullName: 'Dr. Ramesh Kumar P',
        designation: 'Infrastructure Audit Coordinator',
        department: 'Estate Management Cell',
        phone: '9876543210',
        employeeId: 'BIT-ADM-001',
      },
    });
    console.log(`👤 Admin created: ${adminUser.username} | Password: Admin@BIT2025`);

    // Create Auditor Users
    const auditorData = [
      {
        username: 'auditor_senthil',
        email: 'senthil@bitsathy.ac.in',
        password: 'Auditor@BIT1',
        role: 'Auditor',
        profile: { fullName: 'Senthil Kumar R', designation: 'Estate Inspector', department: 'Works Department', phone: '9876543211', employeeId: 'BIT-AUD-001' },
      },
      {
        username: 'auditor_priya',
        email: 'priya@bitsathy.ac.in',
        password: 'Auditor@BIT2',
        role: 'Auditor',
        profile: { fullName: 'Priya Dharshini S', designation: 'Quality Auditor', department: 'IQAC Cell', phone: '9876543212', employeeId: 'BIT-AUD-002' },
      },
      {
        username: 'auditor_murugan',
        email: 'murugan@bitsathy.ac.in',
        password: 'Auditor@BIT3',
        role: 'Auditor',
        profile: { fullName: 'Murugan T', designation: 'Facility Inspector', department: 'Estate Management Cell', phone: '9876543213', employeeId: 'BIT-AUD-003' },
      },
    ];

    const createdAuditors = [];
    for (const data of auditorData) {
      const auditor = await User.create(data);
      createdAuditors.push(auditor);
    }
    console.log(`👥 Created ${createdAuditors.length} auditors`);

    // Create sample assignments
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sampleAssignments = [
      {
        location: createdLocations[0]._id, // Medical Center
        auditor: createdAuditors[0]._id,
        scheduledDate: today,
        dueDate: nextWeek,
        status: 'Pending',
        assignedBy: adminUser._id,
        remarks: 'Monthly routine inspection - check all medical equipment and hygiene standards',
      },
      {
        location: createdLocations[1]._id, // A1 Guest House
        auditor: createdAuditors[1]._id,
        scheduledDate: today,
        dueDate: nextWeek,
        status: 'Pending',
        assignedBy: adminUser._id,
        remarks: 'Pre-inspection before visiting faculty accommodation period',
      },
      {
        location: createdLocations[2]._id, // Community Radio Station
        auditor: createdAuditors[2]._id,
        scheduledDate: today,
        dueDate: nextWeek,
        status: 'Pending',
        assignedBy: adminUser._id,
        remarks: 'Quarterly equipment audit',
      },
      {
        location: createdLocations[3]._id, // R&D
        auditor: createdAuditors[0]._id,
        scheduledDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        dueDate: nextWeek,
        status: 'Pending',
        assignedBy: adminUser._id,
        remarks: 'Safety compliance check for research labs',
      },
    ];

    const createdAssignments = await Assignment.insertMany(sampleAssignments);
    console.log(`📋 Created ${createdAssignments.length} sample assignments`);

    console.log('\n====== SEED COMPLETE ======');
    console.log('Institution: Bannari Amman Institute of Technology');
    console.log('Admin Login  → username: bit_admin | password: Admin@BIT2025');
    console.log('Auditor 1   → username: auditor_senthil | password: Auditor@BIT1');
    console.log('Auditor 2   → username: auditor_priya | password: Auditor@BIT2');
    console.log('Auditor 3   → username: auditor_murugan | password: Auditor@BIT3');
    console.log('===========================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
