import vine, { errors } from "@vinejs/vine";

import prisma from "../db/db.config.js";

import {
  loginValidator,
  registerValidator,
} from "../validations/authValidation.js";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../config/mailer.js";
import logger from "../config/logger.js";
import { emailQueue, emailQueueName } from "../jobs/emailqueue.jobs.js";

class AuthController {
  static async register(req, res) {
    try {
      const body = req.body;
      const payload = await registerValidator.validate(body);

      const salt = bcrypt.genSaltSync(10);

      const findUser = await prisma.users.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (findUser) {
        return res.status(400).json({
          errors: {
            email: "Email already taken . please use another one",
          },
        });
      }

      payload.password = bcrypt.hashSync(payload.password, salt);

      const user = await prisma.users.create({
        data: payload,
      });

      return res.json({
        status: 200,
        message: "User created successfully",
        user,
      });
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return res.status(400).json({ errors: error.messages });
      } else {
        console.log(error);
        return res.status(500).json({
          status: 500,
          message: "Something went wrong ..please try again",
        });
      }
    }
  }

  static async login(req, res) {
    try {
      const body = req.body;

      const payload = await loginValidator.validate(body);

      const findUser = await prisma.users.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (findUser) {
        if (!bcrypt.compareSync(payload.password, findUser.password)) {
          return res.status(400).json({
            errors: {
              email: "Invalid credentials",
            },
          });
        }

        const payloadData = {
          id: findUser.id,
          name: findUser.name,
          email: findUser.email,
          profile: findUser.profile,
        };

        const token = jwt.sign(payloadData, process.env.JWT_SECRET, {
          expiresIn: "365d",
        });

        return res.json({
          message: "Logged in",
          access_token: `Bearer ${token}`,
        });
      }

      return res.status(400).json({
        errors: {
          email: "No user found with this email",
        },
      });
    } catch (err) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return res.status(400).json({ errors: error.messages });
      } else {
        console.log(error);
        return res.status(500).json({
          status: 500,
          message: "Something went wrong ..please try again",
        });
      }
    }
  }

  static async sendTestEmail(req, res) {
    try {
      const { email } = req.query;

      const payload = [
        {
          toEmail: email,
          subject: "Just testing",
          body: "<h1>Hello world , I am from master backend series</h1>",
        },
      ];

      await emailQueue.add(emailQueueName, payload);

      // await sendEmail(payload.toEmail, payload.subject, payload.body);
      return res.json({ status: 200, message: "Email sent successfully" });
    } catch (error) {
      logger.error({ type: "Email error", body: error });
      return res
        .status(500)
        .json({ message: "Something went wrong please try again later" });
    }
  }
}

export default AuthController;
