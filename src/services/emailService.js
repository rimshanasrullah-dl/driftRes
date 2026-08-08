import { Resend } from "resend";

export async function sendOrderConfirmation(toEmail, order) {
  const resend = new Resend(process.env.API_KEY);
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: toEmail,
    subject: "Your order is confirmed!",
    html: `
      <h2>Thanks for your order!</h2>
      <p>Your order total is <strong>Rs ${order.totalPrice}</strong>.</p>
      <p>Status: ${order.status}</p>
    `,
  });
}
