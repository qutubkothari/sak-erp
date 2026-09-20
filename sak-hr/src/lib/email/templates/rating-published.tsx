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

interface RatingPublishedEmailProps {
  employeeName: string;
  reviewCycleName: string;
  overallRating: number;
  ratingLabel: string;
  managerName: string;
  salaryIncreasePercent?: number;
}

export const RatingPublishedEmail = ({
  employeeName = 'Employee',
  reviewCycleName = 'Annual Performance Review 2024',
  overallRating = 4,
  ratingLabel = 'Exceeds Expectations',
  managerName = 'Your Manager',
  salaryIncreasePercent,
}: RatingPublishedEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#059669'; // Excellent - Green
    if (rating >= 3.5) return '#2563EB'; // Good - Blue
    if (rating >= 2.5) return '#F59E0B'; // Satisfactory - Amber
    return '#DC2626'; // Needs Improvement - Red
  };

  const getRatingEmoji = (rating: number) => {
    if (rating >= 4.5) return '⭐';
    if (rating >= 3.5) return '👍';
    if (rating >= 2.5) return '📊';
    return '📈';
  };

  return (
    <Html>
      <Head />
      <Preview>Your performance review results are ready - {reviewCycleName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {getRatingEmoji(overallRating)} Performance Review Results
          </Heading>
          
          <Text style={text}>Dear {employeeName},</Text>
          
          <Text style={text}>
            Your performance review for <strong>{reviewCycleName}</strong> has been completed
            and finalized. We appreciate your hard work and contributions to the organization.
          </Text>

          <Section
            style={{
              ...ratingBox,
              borderColor: getRatingColor(overallRating),
            }}
          >
            <Text style={ratingTitle}>Your Overall Rating</Text>
            <Text
              style={{
                ...ratingScore,
                color: getRatingColor(overallRating),
              }}
            >
              {overallRating.toFixed(1)} / 5.0
            </Text>
            <Text style={ratingLabel_style}>{ratingLabel}</Text>
          </Section>

          {salaryIncreasePercent !== undefined && salaryIncreasePercent > 0 && (
            <Section style={increaseBox}>
              <Text style={increaseTitle}>💰 Salary Adjustment</Text>
              <Text style={increaseText}>
                Based on your performance, you will receive a{' '}
                <strong style={{ color: '#059669', fontSize: '18px' }}>
                  {salaryIncreasePercent}%
                </strong>{' '}
                salary increase, effective from next month.
              </Text>
            </Section>
          )}

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Review Cycle:</strong> {reviewCycleName}
            </Text>
            <Text style={infoText}>
              <strong>Reviewed By:</strong> {managerName}
            </Text>
            <Text style={infoText}>
              <strong>Review Date:</strong>{' '}
              {new Date().toLocaleDateString('en-AE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${baseUrl}/performance/evaluations`}>
              View Detailed Feedback
            </Button>
          </Section>

          <Text style={text}>
            Your detailed performance feedback, including competency ratings, strengths,
            and development areas, is available in the system. We encourage you to review
            the feedback and discuss your development plan with your manager.
          </Text>

          <Section style={nextStepsBox}>
            <Text style={nextStepsTitle}>📌 Next Steps:</Text>
            <Text style={nextStepItem}>
              1. Review your detailed evaluation and feedback
            </Text>
            <Text style={nextStepItem}>
              2. Schedule a meeting with {managerName} to discuss your development plan
            </Text>
            <Text style={nextStepItem}>
              3. Set goals for the next review period
            </Text>
            <Text style={nextStepItem}>
              4. Acknowledge receipt of your performance review in the system
            </Text>
          </Section>

          <Text style={footer}>
            If you have questions about your review, please contact your manager or HR department.
            <br />
            <br />
            SAK HR Performance Management System
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default RatingPublishedEmail;

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

const ratingBox = {
  backgroundColor: '#FFFFFF',
  border: '3px solid',
  borderRadius: '12px',
  padding: '32px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const ratingTitle = {
  color: '#6B7280',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const ratingScore = {
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '8px 0',
  lineHeight: '1',
};

const ratingLabel_style = {
  color: '#6F4E37',
  fontSize: '20px',
  fontWeight: '600',
  margin: '8px 0 0 0',
};

const increaseBox = {
  backgroundColor: '#ECFDF5',
  border: '2px solid #10B981',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const increaseTitle = {
  color: '#065F46',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const increaseText = {
  color: '#047857',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#F7F4EF',
  border: '1px solid #E8DCC4',
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

const nextStepsBox = {
  backgroundColor: '#EFF6FF',
  border: '1px solid #DBEAFE',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const nextStepsTitle = {
  color: '#1E40AF',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const nextStepItem = {
  color: '#1E3A8A',
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
