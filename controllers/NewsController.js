import { errors } from "@vinejs/vine";
import { newsValidator } from "../validations/newsValidation.js";
import {
  generateRandomNum,
  imageUpload,
  imageValidator,
  removeImage,
} from "../utils/helper.js";
import prisma from "../db/db.config.js";
import NewsApiTransform from "../transform/newsApiTransform.js";
import redisCache from "../config/redisconfig.js";

class NewsController {
  static async index(req, res) {
    try {
      let page = Number(req.query.page) || 1;
      let limit = Number(req.query.limit) || 10;

      if (page <= 0) {
        page = 1;
      }

      if (limit <= 0 || limit > 100) {
        limit = 10;
      }

      const skip = (page - 1) * limit;

      const news = await prisma.news.findMany({
        take: limit,
        skip: skip,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: true,
            },
          },
        },
      });

      const newsTransform = news?.map((item) =>
        NewsApiTransform.transform(item),
      );

      const totalNews = await prisma.news.count();
      const totalPages = Math.ceil(totalNews / limit);

      return res.json({
        status: 200,
        news: newsTransform,
        metadata: {
          totalPages,
          currentPage: page,
          currentLimit: limit,
        },
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

  static async store(req, res) {
    try {
      const user = req.user;

      const body = req.body;

      const payload = await newsValidator.validate(body);

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          errors: {
            image: "Image field is required",
          },
        });
      }

      const image = req.files?.image;

      const message = imageValidator(image?.size, image?.mimetype);

      if (message !== null) {
        return res.status(400).json({
          errors: {
            image: message,
          },
        });
      }

      const imgExt = image?.name.split(".");

      const imageName = generateRandomNum() + "." + imgExt[1];

      const uploadPath = process.cwd() + "/public/images/" + imageName;

      image.mv(uploadPath, (err) => {
        if (err) throw err;
      });

      payload.image = imageName;
      payload.user_id = user.id;

      const news = await prisma.news.create({
        data: payload,
      });

      redisCache.del("/api/news", (err) => {
        if (err) throw err;
      });

      res.status(200).json({ message: "News create successfully", news });
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

  static async show(req, res) {
    try {
      const { id } = req.params;
      const news = await prisma.news.findUnique({
        where: {
          id: Number(id),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: true,
            },
          },
        },
      });

      const transformNews = news ? NewsApiTransform.transform(news) : null;

      return res.json({ status: 200, news: transformNews });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Something went wrong please try again" });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const body = req.body;

      const news = await prisma.news.findUnique({
        where: {
          id: Number(id),
        },
      });

      if (user.id !== news.user_id) {
        return res.status(400).json({ message: "Unauthorized" });
      }

      const payload = await newsValidator.validate(body);

      const image = req?.files?.image;

      if (image) {
        const message = imageValidator(image?.size, image?.mimetype);

        if (message !== null) {
          return res.status(400).json({
            errors: {
              image: message,
            },
          });
        }

        // upload new image

        const imageName = imageUpload(image);
        payload.image = imageName;

        console.log(news.image);

        removeImage(news.image);
      }

      console.log(payload);

      await prisma.news.update({
        data: payload,
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({ message: "news updated successfully" });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Something went wrong please try again" });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const user = req.user;

      const news = await prisma.news.findUnique({
        where: {
          id: Number(id),
        },
      });

      if (user.id !== news?.user_id) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      removeImage(news.image);

      await prisma.news.delete({
        where: {
          id: Number(id),
        },
      });
      redisCache.del("/api/news", (err) => {
        if (err) throw err;
      });

      return res.status(200).json({ message: "news deleted successfully" });
    } catch (err) {
      console.log(err, "err");
      return res
        .status(500)
        .json({ message: "Something went wrong please try again" });
    }
  }
}

export default NewsController;
