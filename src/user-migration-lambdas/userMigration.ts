import type {
  UserMigrationTriggerEvent,
  UserMigrationAuthenticationTriggerEvent,
  UserMigrationForgotPasswordTriggerEvent,
} from "aws-lambda";
import CryptoES from "crypto-es";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import {
  MONGODB_URI,
  INCORRECT_TRIGGER,
  INCORRECT_PWD,
  INCORRECT_USER,
  INCORRECT_USER_DOMAIN,
} from "./constants";

import type { WithId, Document } from "mongodb";
interface IUser extends WithId<Document> {
  services: {
    password: {
      bcrypt: string;
    };
  } | null;
}
export interface IUserDocument extends IUser {}

async function userLookup(email: string): Promise<IUserDocument | null> {
  const url = new URL(MONGODB_URI);
  const databaseName = url.pathname.slice(1);
  url.pathname = "";
  const client = await MongoClient.connect(url.toString());
  const db = client.db(databaseName);
  const Users = db.collection("users");
  const user = (await Users.findOne({
    "emails.address": email,
  })) as IUserDocument;
  client.close();
  return user;
}

function isDomainAllowed(email: string): boolean {
  const [_, domain] = email.split("@");
  return domain == "swellenergy.com" ? false : true;
}

export const generateMigrationEventResponse = (
  event: UserMigrationTriggerEvent
): UserMigrationTriggerEvent => {
  event.response.userAttributes = {
    username: event.userName,
    email: event.userName,
    email_verified: "true",
  };
  event.response.finalUserStatus = "RESET_REQUIRED";
  event.response.messageAction = "SUPPRESS";
  console.log(
    `value of final event for ${event.userName} " + ${JSON.stringify(
      event.response
    )}`
  );
  return event;
};

export const generateForgotPasswordventResponse = (
  event: UserMigrationTriggerEvent
): UserMigrationTriggerEvent => {
  if (isDomainAllowed(event.userName)) {
    event.response.userAttributes = {
      username: event.userName,
      email: event.userName,
      email_verified: "true",
    };
    console.log(
      `value of final event for ${event.userName} " + ${JSON.stringify(
        event.response
      )}`
    );
    return event;
  } else {
    throw new Error(`${INCORRECT_USER_DOMAIN}: for ${event.userName}`);
  }
};

export const migrateUserAuthentication = async (
  event: UserMigrationAuthenticationTriggerEvent
): Promise<UserMigrationAuthenticationTriggerEvent> => {
  if (isDomainAllowed(event.userName)) {
    let hash: string | undefined;
    let hexVal: string;
    try {
      const result = await userLookup(event.userName);
      hash = result?.services?.password.bcrypt;
      hexVal = CryptoES.SHA256(event.request.password).toString(
        CryptoES.enc.Hex
      );
    } catch (error) {
      console.log(error);
      throw new Error(`${event.userName} ${INCORRECT_USER}`);
    }
    if (hash) {
      const match = await bcrypt.compare(hexVal, hash);
      if (match) {
        return generateMigrationEventResponse(
          event
        ) as UserMigrationAuthenticationTriggerEvent;
      } else {
        throw new Error(`${INCORRECT_PWD}:  for ${event.userName}`);
      }
    } else {
      throw new Error(`${event.userName} ${INCORRECT_USER}`);
    }
  } else {
    throw new Error(`${INCORRECT_USER_DOMAIN}: for ${event.userName}`);
  }
};

export const migrateUserForgotPassword = async (
  event: UserMigrationForgotPasswordTriggerEvent
): Promise<UserMigrationForgotPasswordTriggerEvent> => {
  const [_, domain] = event.userName.split("@");
  if (domain == "swellenergy.com") {
    throw new Error(`${INCORRECT_USER_DOMAIN}:  for ${event.userName}`);
  }
  try {
    const user = await userLookup(event.userName);
    if (user) {
      return generateForgotPasswordventResponse(
        event
      ) as UserMigrationForgotPasswordTriggerEvent;
    } else {
      throw new Error(`${event.userName} ${INCORRECT_USER}`);
    }
  } catch (error) {
    console.log(error);
    throw new Error(`${event.userName} ${error}`);
  }
};

export const handler = async (
  event: UserMigrationTriggerEvent
): Promise<UserMigrationTriggerEvent> => {
  switch (event.triggerSource) {
    case "UserMigration_Authentication":
      return migrateUserAuthentication(event);
    case "UserMigration_ForgotPassword":
      return migrateUserForgotPassword(event);
    default:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`${INCORRECT_TRIGGER}: ${event.triggerSource}`);
  }
};
