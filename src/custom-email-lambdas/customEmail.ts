"use strict";
import type {
  CustomEmailSenderAdminCreateUserTriggerEvent,
  CustomEmailSenderForgotPasswordTriggerEvent
} from "aws-lambda";
import { INCORRECT_TRIGGER } from "./constants";
import { templateEnrollEmail } from "./template";
import { sendEmail } from "./emailWorker";
import { buildClient, CommitmentPolicy, KmsKeyringNode } from '@aws-crypto/client-node';
import { Boolean } from "aws-sdk/clients/apigateway";
const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
const kmsKeyring = new KmsKeyringNode({
  keyIds: [process.env.COGNITO_EMAILER_KEY_ARN!]
});

export const handler = async (
  event:
    | CustomEmailSenderAdminCreateUserTriggerEvent
    | CustomEmailSenderForgotPasswordTriggerEvent
) => {
  switch
   (event.triggerSource) {
    case "CustomEmailSender_AdminCreateUser":
      return generateCustomEmailResponse(event,false);
    case "CustomEmailSender_ForgotPassword":
      return generateCustomEmailResponse(event,true);
    default:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions

      throw new Error(`${INCORRECT_TRIGGER} : ${event.triggerSource}`);
  }
};

export const generateCustomEmailResponse = async (
  event: CustomEmailSenderAdminCreateUserTriggerEvent | CustomEmailSenderForgotPasswordTriggerEvent,forgotpassword:boolean
): Promise<Boolean> => {
  const supportemail = process.env.SUPPPORT_EMAIL!;
  const waveurl = process.env.WAVE_URL!;
  const useremail = event.request.userAttributes.email!;
  try {
    let payload = '';
    if (event.request.code) {
      const { plaintext, messageHeader } = await decrypt(
        kmsKeyring,
        Buffer.from(event.request.code, "base64")
      );
      if (event.userPoolId !== messageHeader.encryptionContext["userpool-id"]) {
        console.error(`Encryption context does not match expected values for user pool:${event.userPoolId}`);
        return false;
      }

      payload = plaintext.toString();
      if(forgotpassword){
        await sendEmail(useremail, "Reset Password", `Reset Password with ${payload}`);
        return true;
      }
      const getTemplateData =  await templateEnrollEmail(
        useremail,
        payload,
        waveurl,
        supportemail
      );
      await sendEmail(useremail, getTemplateData?.subject!, getTemplateData?.content!);
    }
  return true;
  } catch (error) {
    console.log(error);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`${useremail} ${error?.errorMessage}`);
  }
};