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

interface ReviewReminderEmailProps {
  employeeName: string;
  reviewCycleName: string;
  dueDate: string;
  reviewType: 'self-assessment' | 'manager-review' | 'final';
  daysRemaining: number;
}

export const ReviewReminderEmail = ({
  employeeName = 'Employee',
  reviewCycleName = 'Annual Performance Review 2024',
  dueDate = '2024-12-31',
  reviewType = 'self-assessment',
  daysRemaining = 7,
}: ReviewReminderEmailProps) => {
  const getTypeLabel = () => {
    switch (reviewType) {
      case 'self-assessment':
        return 'Self-Assessment';
      case 'manager-review':
        return 'Manager Review';
      case 'final':
        return 'Final Review Acknowledgment';
      default:
        return 'Performance Review';
    }
  };

  const getActionUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    switch (reviewType) {
      case 'self-assessment':
        return `${baseUrl}/performance/self-assessment`;
      case 'manager-review':
        return `${baseUrl}/performance/team-reviews`;
      default:
        return `${baseUrl}/performance/evaluations`;
    }
  };

  const isUrgent = daysRemaining <= 3;

  return (
    <Html>
      <Head />
      <Preview>
        {isUrgent ? '⚠️ URGENT: ' : ''}Performance Review Due - {reviewCycleName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isUrgent ? '⚠️ ' : ''}Performance Review {isUrgent ? 'Overdue' : 'Reminder'}
          </Heading>
          
          <Text style={text}>Dear {employeeName},</Text>
          
          <Text style={text}>
            This is a {isUrgent ? 'final' : 'friendly'} reminder that your{' '}
            <strong>{getTypeLabel()}</strong> for <strong>{reviewCycleName}</strong> is due{' '}
            {isUrgent ? 'soon' : `in ${daysRemaining} days`}.
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Review Cycle:</strong> {reviewCycleName}
            </Text>
            <Text style={infoText}>
              <strong>Type:</strong> {getTypeLabel()}
            </Text>
            <Text style={infoText}>
              <strong>Due Date:</strong> {new Date(dueDate).toLocaleDateString('en-AE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={{ ...infoText, color: isUrgent ? '#dc2626' : '#6F4E37' }}>
              <strong>Days Remaining:</strong> {daysRemaining}
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={getActionUrl()}>
              {reviewType === 'self-assessment' && 'Start Self-Assessment'}
              {reviewType === 'manager-review' && 'Review Team Performance'}
              {reviewType === 'final' && 'View Final Evaluation'}
            </Button>
          </Section>

          <Text style={text}>
            Please complete your {getTypeLabel().toLowerCase()} before the due date to ensure
            timely processing of all performance reviews.
          </Text>

          {reviewType === 'self-assessment' && (
            <Text style={tipText}>
              <strong>💡 Tip:</strong> Prepare examples of your key achievements, challenges
              overcome, and skills developed during this review period before starting your
              self-assessment.
            </Text>
          )}

          <Text style={footer}>
            This is an automated notification from SAK HR Performance Management System.
            <br />
            If you have any questions, please contact your HR department.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ReviewReminderEmail;

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
  padding: '20px',
  margin: '24px 0',
};

const infoText = {
  color: '#36454F',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
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

const tipText = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FDE047',
  borderRadius: '6px',
  color: '#854D0E',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '16px',
  margin: '24px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};
