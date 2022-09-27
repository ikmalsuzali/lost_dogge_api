import "dotenv/config";
import Fastify, { fastify } from "fastify";
import cors from "fastify-cors";
import { randomBytes } from "crypto";
import { registerRoutes } from "./routes";
import { prisma } from "./prisma";
// @ts-ignore
import axiosClient from 'fastify-axios'


const main = async () => {
  const server = Fastify({
    genReqId: () => randomBytes(8).toString("hex"),
    logger: true,
  });


  server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  server.register(axiosClient, {
    name: 'axios'
  })

  // connect to database
  await prisma.$connect();
  server.log.info("Connected to Prisma");

  // register all routes
  registerRoutes(server);

  try {
    await server.listen(process.env.PORT || 8080, "0.0.0.0");
  } catch (err) {
    server.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};
main();
