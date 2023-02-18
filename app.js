const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const auth = new google.auth.OAuth2({
  clientId: "<client_id>",
  clientSecret: "<client_secret>",
  redirectUri: "http://localhost:3000/oauth2callback",
});

auth.setCredentials({
  access_token: "",
  refresh_token: "",
});

const gmail = google.gmail({ version: "v1", auth });

const autoReply = async () => {
  console.log("Running...");

  try {
    const emailQuery = "is:unread";
    const emailResponse = await gmail.users.messages.list({
      userId: "me",
      q: emailQuery,
    });

    const emailIds = emailResponse.data.messages.map((message) => message.id);
    for (const emailId of emailIds) {
      const email = await gmail.users.messages.get({
        userId: "me",
        id: emailId,
      });

      const threadId = email.data.threadId;
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
      });

      if (thread.data.messages.length === 1) {
        const message = thread.data.messages[0];
        const to =
          message.payload.headers.find(
            (header) => header.name === "Reply-To"
          ) || message.payload.headers.find((header) => header.name === "From");
        const subject = message.payload.headers.find(
          (header) => header.name === "Subject"
        );
        const text =
          "Thank you for reaching out! I am currently not available and will reply as soon as possible.";

        const mailOptions = {
          to: to.value,
          subject: subject.value,
          text: text,
        };

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            type: "OAuth2",
            user: "<your_mail_id>",
            clientId: "<client_id>",
            clientSecret: "<client_secret>",
            refreshToken: "",
            accessToken: "",
          },
        });

        await transporter.sendMail(mailOptions);

        const labelName = "Auto-reply (Vacation)";
        const labelResponse = await gmail.users.labels.list({ userId: "me" });
        const label = labelResponse.data.labels.find(
          (label) => label.name === labelName
        );
        if (!label) {
          const newLabel = await gmail.users.labels.create({
            userId: "me",
            requestBody: { name: labelName },
          });

          await gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              addLabelIds: [newLabel.data.id],
              removeLabelIds: ["INBOX"],
            },
          });
        } else {
          await gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              addLabelIds: [label.id],
              removeLabelIds: ["INBOX"],
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed with error: ", error);
  }

  const randomInterval = 45 * 1000;

  setTimeout(autoReply, randomInterval);
};

autoReply();
