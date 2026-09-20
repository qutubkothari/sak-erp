import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface CycleStartedEmailProps {
  employeeName: string;
  reviewCycleName: string;
  startDate: string;
  endDate: string;
  selfAssessmentDue: string;
}

export const CycleStartedEmail = ({
  employeeName = 'Employee',
  reviewCycleName = 'Annual Performance Review 2024',
  startDate = '2024-01-01',
  endDate = '2024-12-31',
  selfAssessmentDue = '2024-11-30',
}: CycleStartedEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <Html>
      <Head />
      <Preview>New Performance Review Cycle: {reviewCycleName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎯 New Performance Review Cycle Started</Heading>
          
          <Text style={text}>Dear {employeeName},</Text>
          
          <Text style={text}>
            We're pleased to inform you that a new performance review cycle has commenced.
            This is an opportunity to reflect on your achievements, set new goals, and plan
            your professional development.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>{reviewCycleName}</Text>
            <Text style={infoText}>
              <strong>Review Period:</strong>{' '}
              {new Date(startDate).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })}{' '}
              to {new Date(endDate).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })}
            </Text>
            <Text style={infoText}>
              <strong>Self-Assessment Due:</strong>{' '}
              {new Date(selfAssessmentDue).toLocaleDateString('en-AE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Section>

          <Section style={stepsSection}>
            <Text style={stepsTitle}>📋 Review Process Timeline:</Text>
            <Text style={stepItem}>
              <strong>Step 1:</strong> Complete your self-assessment by{' '}
              {new Date(selfAssessmentDue).toLocaleDateString('en-AE')}
            </Text>
            <Text style={stepItem}>
              <strong>Step 2:</strong> Your manager will review and provide feedback
            </Text>
            <Text style={stepItem}>
              <strong>Step 3:</strong> Performance calibration session
            </Text>
            <Text style={stepItem}>
              <strong>Step 4:</strong> Final rating communication and development planning
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${baseUrl}/performance/evaluations`}>
              View Review Details
            </Button>
          </Section>

          <Section style={tipsSection}>
            <Text style={tipsTitle}>💡 Tips for a Successful Review:</Text>
            <Text style={tipItem}>
              • Gather evidence of your accomplishments (projects completed, goals achieved)
            </Text>
            <Text style={tipItem}>
              • Reflect on challenges faced and how you overcame them
            </Text>
            <Text style={tipItem}>
              • Identify skills you've developed and areas for growth
            </Text>
            <Text style={tipItem}>
              • Prepare specific examples for each competency
            </Text>
            <Text style={tipItem}>
              • Think about your career goals for the next review period
            </Text>
          </Section>

          <Text style={footer}>
            For questions about the performance review process, please contact your HR department.
            <br />
            <br />
            SAK HR Performance Management System
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CycleStartedEmail;

// Styles
const main = {
  backgroundColor: '#FAF9F6',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#6F4E37',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#36454F',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const infoBox = {
  backgroundColor: '#F7F4EF',
  border: '2px solid #E8DCC4',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#6F4E37',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const infoText = {
  color: '#36454F',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const stepsSection = {
  backgroundColor: '#EEF2FF',
  border: '1px solid #C7D2FE',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const stepsTitle = {
  color: '#4338CA',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const stepItem = {
  color: '#36454F',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
  paddingLeft: '4px',
};

const tipsSection = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FDE047',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const tipsTitle = {
  color: '#854D0E',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const tipItem = {
  color: '#78350F',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '6px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#6F4E37',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};
