"use strict";
import type {
  CustomMessageAdminCreateUserTriggerEvent,
  CustomMessageForgotPasswordTriggerEvent,
  CustomMessageAuthenticationTriggerEvent,
  CustomMessageUpdateUserAttributeTriggerEvent
} from "aws-lambda";
import { INCORRECT_TRIGGER } from "./constants";
import { templateEnrollEmail } from "./template";
export const handler = async (
  event:
    | CustomMessageAdminCreateUserTriggerEvent
    | CustomMessageAuthenticationTriggerEvent
    | CustomMessageForgotPasswordTriggerEvent
    | CustomMessageUpdateUserAttributeTriggerEvent
) => {
  switch (event.triggerSource) {
    case "CustomMessage_AdminCreateUser":
      return generateCustomEmailResponse(event);
    case "CustomMessage_Authentication":
      return generateCustomMFAResponse(event);
    case "CustomMessage_ForgotPassword":
      return generateCustomForgotPasswordResponse(event);
    case "CustomMessage_UpdateUserAttribute":
      return event;
    default:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions

      throw new Error(`${INCORRECT_TRIGGER} : ${event.triggerSource}`);
  }
};

export const generateCustomEmailResponse = async (
  event: CustomMessageAdminCreateUserTriggerEvent
): Promise<CustomMessageAdminCreateUserTriggerEvent> => {
  const supportemail = process.env.SUPPPORT_EMAIL!;
  const waveurl = process.env.WAVE_URL!;
  const useremail = event.request.userAttributes.email!;
  const code = event.request.codeParameter;
  try {
    const getTemplateData = await templateEnrollEmail(
      useremail,
      code,
      waveurl,
      supportemail
    );
    event.response.emailSubject = getTemplateData?.subject!;
    event.response.emailMessage = getTemplateData?.content!;
    return event;
  } catch (error) {
    console.log(error);
    throw new Error(`${event.userName} ${error}`);
  }
};

export const generateCustomMFAResponse = (
  event: CustomMessageAuthenticationTriggerEvent
): CustomMessageAuthenticationTriggerEvent => {
  const useremail = event.request.userAttributes.email!;
  try {
    return event;
  } catch (error) {
    console.log(error);
    throw new Error(`${useremail} : ${error}`);
  }
};

export const generateCustomForgotPasswordResponse = (
  event: CustomMessageForgotPasswordTriggerEvent
): CustomMessageForgotPasswordTriggerEvent => {
  const useremail = event.request.userAttributes.email!;
  try {
    return event;
  } catch (error) {
    console.log(error);
    throw new Error(`${useremail} : ${error}`);
  }
};