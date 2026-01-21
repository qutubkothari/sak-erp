import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (optional - you can use system fonts or custom fonts)
// Font.register({
//   family: 'Arial',
//   src: '/fonts/Arial.ttf',
// });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #6F4E37',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6F4E37',
    marginBottom: 5,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#36454F',
    marginTop: 10,
  },
  dateSection: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6F4E37',
    marginBottom: 10,
    borderBottom: '1 solid #E8DCC4',
    paddingBottom: 5,
  },
  text: {
    marginBottom: 8,
    color: '#36454F',
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  table: {
    display: 'table' as any,
    width: '100%',
    marginBottom: 15,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E8DCC4',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#F4ECE2',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E8DCC4',
    fontSize: 10,
  },
  tableCell40: {
    width: '40%',
  },
  tableCell20: {
    width: '20%',
  },
  ratingBox: {
    backgroundColor: '#F7F4EF',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    border: '1 solid #E8DCC4',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6F4E37',
    marginBottom: 5,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTop: '1 solid #36454F',
    marginTop: 30,
    paddingTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTop: '1 solid #E8DCC4',
    paddingTop: 10,
  },
});

interface AppraisalData {
  employeeName: string;
  employeeId: string;
  position: string;
  department: string;
  reviewPeriod: string;
  reviewDate: string;
  overallRating: number;
  competencyRatings: { name: string; rating: number }[];
  strengths: string;
  areasForImprovement: string;
  developmentPlan: string;
  managerComments: string;
  managerName: string;
  salaryRecommendation: string;
  salaryIncreasePercent?: number;
  recommendedPromotion?: string;
}

const getRatingText = (rating: number): string => {
  switch (rating) {
    case 1:
      return 'Needs Improvement';
    case 2:
      return 'Below Expectations';
    case 3:
      return 'Meets Expectations';
    case 4:
      return 'Exceeds Expectations';
    case 5:
      return 'Outstanding';
    default:
      return 'Not Rated';
  }
};

export const AppraisalLetterPDF: React.FC<{ data: AppraisalData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>SAK ERP - Performance Management</Text>
        <Text style={styles.documentTitle}>Performance Appraisal Letter</Text>
        <Text style={styles.dateSection}>
          Review Period: {data.reviewPeriod} | Date: {data.reviewDate}
        </Text>
      </View>

      {/* Employee Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableCell40]}>Field</Text>
            <Text style={[styles.tableCell, { width: '60%' }]}>Details</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCell40]}>Employee Name</Text>
            <Text style={[styles.tableCell, { width: '60%' }]}>{data.employeeName}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCell40]}>Employee ID</Text>
            <Text style={[styles.tableCell, { width: '60%' }]}>{data.employeeId}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCell40]}>Position</Text>
            <Text style={[styles.tableCell, { width: '60%' }]}>{data.position}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCell40]}>Department</Text>
            <Text style={[styles.tableCell, { width: '60%' }]}>{data.department}</Text>
          </View>
        </View>
      </View>

      {/* Overall Performance Rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Performance Rating</Text>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingText}>
            Rating: {data.overallRating}/5 - {getRatingText(data.overallRating)}
          </Text>
          <Text style={styles.text}>
            Based on comprehensive evaluation of competencies, KPI achievements, and overall contributions
            during the review period.
          </Text>
        </View>
      </View>

      {/* Competency Ratings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Competency Ratings</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { width: '50%' }]}>Competency</Text>
            <Text style={[styles.tableCell, styles.tableCell20]}>Rating</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>Assessment</Text>
          </View>
          {data.competencyRatings.map((comp, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{comp.name}</Text>
              <Text style={[styles.tableCell, styles.tableCell20]}>{comp.rating}/5</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>{getRatingText(comp.rating)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Strengths */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Strengths</Text>
        <Text style={styles.text}>{data.strengths}</Text>
      </View>

      {/* Areas for Improvement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Areas for Improvement</Text>
        <Text style={styles.text}>{data.areasForImprovement}</Text>
      </View>

      {/* Development Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Plan</Text>
        <Text style={styles.text}>{data.developmentPlan}</Text>
      </View>

      {/* Manager Comments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manager Comments</Text>
        <Text style={styles.text}>{data.managerComments}</Text>
      </View>

      {/* Compensation Recommendation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compensation Recommendation</Text>
        <View style={styles.ratingBox}>
          <Text style={styles.bold}>
            {data.salaryRecommendation === 'increase' && `Salary Increase: ${data.salaryIncreasePercent}%`}
            {data.salaryRecommendation === 'promotion' &&
              `Promotion Recommended: ${data.recommendedPromotion}`}
            {data.salaryRecommendation === 'no-change' && 'Maintain Current Compensation'}
          </Text>
        </View>
      </View>

      {/* Signatures */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine}>
            <Text>Employee Signature</Text>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 3 }}>Date: _____________</Text>
          </View>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine}>
            <Text>Manager Signature</Text>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 3 }}>{data.managerName}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          This performance appraisal is confidential and intended solely for HR records and employee
          development purposes.
        </Text>
        <Text>Generated by SAK Performance Evaluation System</Text>
      </View>
    </Page>
  </Document>
);

export default AppraisalLetterPDF;
