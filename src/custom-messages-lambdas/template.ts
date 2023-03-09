import { MongoClient, ObjectId } from "mongodb";
import { MONGODB_URI, TEMPLATE_TYPE } from "./constants";
import type { WithId, Document } from "mongodb";
import * as Handlebars from "handlebars";

interface ITemplate extends WithId<Document> {
  _id: ObjectId;
  content: string;
  subject: string;
}

async function Lookup(event_type: string): Promise<ITemplate | null> {
  const url = new URL(MONGODB_URI);
  const databaseName = url.pathname.slice(1);
  url.pathname = "";
  const client = await MongoClient.connect(url.toString());
  const db = client.db(databaseName);
  const templates = db.collection("email_templates");
  const template = (await templates.findOne({
    eventType: event_type,
  })) as ITemplate;
  client.close();
  return template;
}

export const templateEnrollEmail = async (
  username: string,
  code:string,
  waveurl: string,
  supportemail: string
): Promise<ITemplate | null> => {
  const dbTemplate = await Lookup(TEMPLATE_TYPE);
  if (dbTemplate == null) {
    throw new Error(`${TEMPLATE_TYPE} email template not found for ${username}`);
  }
  
  const compiledTemplate = Handlebars.compile(dbTemplate?.content!);
  const templateInvite = compiledTemplate({
    email: username,
    code: code,
    waveurl: waveurl,
    supportemail: supportemail,
  });
  const subject = dbTemplate?.subject!;
  let templateData = {
    content: templateInvite,
    subject: subject,
    _id: new ObjectId(),
  };
  return templateData;
};
