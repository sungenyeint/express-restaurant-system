import express from "express";
import { createQr, printCustomer, printKitchen, printQr } from "../controller/PrintController.js";

const router = express.Router();

// Qr
router.get('/orders/:id/qr', createQr);
router.get('/print/customer/:id', printCustomer);
router.get('/print/kitchen/:id', printKitchen);
router.get('/print/qr/:id', printQr);

export default router;
