import { render } from '@react-email/components';
import { transporter, emailFrom } from './config';
import { ReviewReminderEmail } from './templates/review-reminder';
import { CycleStartedEmail } from './templates/cycle-started';
import { RatingPublishedEmail } from './templates/rating-published';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Generic email sender
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const info = await transporter.sendMail({
      from: `${emailFrom.name} <${emailFrom.address}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return { success: false, error };
  }
}

/**
 * Send review reminder email
 */
export async function sendReviewReminder({
  to,
  employeeName,
  reviewCycleName,
  dueDate,
  reviewType,
  daysRemaining,
}: {
  to: string;
  employeeName: string;
  reviewCycleName: string;
  dueDate: string;
  reviewType: 'self-assessment' | 'manager-review' | 'final';
  daysRemaining: number;
}) {
  const html = await render(
    ReviewReminderEmail({
      employeeName,
      reviewCycleName,
      dueDate,
      reviewType,
      daysRemaining,
    })
  );

  const urgencyPrefix = daysRemaining <= 3 ? '⚠️ URGENT: ' : '';
  const subject = `${urgencyPrefix}Performance Review Reminder - ${reviewCycleName}`;

  return sendEmail({ to, subject, html });
}

/**
 * Send cycle started notification
 */
export async function sendCycleStarted({
  to,
  employeeName,
  reviewCycleName,
  startDate,
  endDate,
  selfAssessmentDue,
}: {
  to: string;
  employeeName: string;
  reviewCycleName: string;
  startDate: string;
  endDate: string;
  selfAssessmentDue: string;
}) {
  const html = await render(
    CycleStartedEmail({
      employeeName,
      reviewCycleName,
      startDate,
      endDate,
      selfAssessmentDue,
    })
  );

  const subject = `🎯 New Performance Review Cycle: ${reviewCycleName}`;

  return sendEmail({ to, subject, html });
}

/**
 * Send rating published notification
 */
export async function sendRatingPublished({
  to,
  employeeName,
  reviewCycleName,
  overallRating,
  ratingLabel,
  managerName,
  salaryIncreasePercent,
}: {
  to: string;
  employeeName: string;
  reviewCycleName: string;
  overallRating: number;
  ratingLabel: string;
  managerName: string;
  salaryIncreasePercent?: number;
}) {
  const html = await render(
    RatingPublishedEmail({
      employeeName,
      reviewCycleName,
      overallRating,
      ratingLabel,
      managerName,
      salaryIncreasePercent,
    })
  );

  const subject = `✅ Performance Review Complete - ${reviewCycleName}`;

  return sendEmail({ to, subject, html });
}

/**
 * Batch send emails (for cycle start to all employees)
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>
) {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`📧 Batch email results: ${successful} sent, ${failed} failed`);

  return {
    total: emails.length,
    successful,
    failed,
    results,
  };
}
