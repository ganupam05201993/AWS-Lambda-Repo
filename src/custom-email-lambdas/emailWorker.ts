import FormData from "form-data";
import Mailgun from "mailgun.js";
import { MAILGUN_KEY, MAILGUN_DOMAIN } from "./constants";

const mailgun = new Mailgun(FormData);
const client = mailgun.client({ username: "api", key: MAILGUN_KEY });

export const sendEmail = async (
  userName: string,
  emailSubject: string,
  emailMessage: string
) => {
  const messageData = {
    from: process.env.SUPPPORT_EMAIL!,
    to: userName,
    subject: emailSubject,
    html: emailMessage,
  };
  return client.messages.create(MAILGUN_DOMAIN, messageData);
};
