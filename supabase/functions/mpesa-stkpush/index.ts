import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ================================================================
// CORS HEADERS — allows your academy page to call this function
// ================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse incoming payload from academy page
    const { name, email, phone, amount, tier } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Phone and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get credentials from environment variables
    const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY")!;
    const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET")!;
    const SHORTCODE = Deno.env.get("MPESA_SHORTCODE")!;
    const PASSKEY = Deno.env.get("MPESA_PASSKEY")!;
    const CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL")!;

    // 3. Generate OAuth token from Safaricom
    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Failed to obtain Daraja access token");
    }

    // 4. Generate timestamp and password
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    // 5. Fire STK Push to customer's phone
    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: CALLBACK_URL,
          AccountReference: `SavannaAcademy-${tier}`,
          TransactionDesc: `Savanna Academy ${tier} tier access`,
        }),
      }
    );

    const stkData = await stkRes.json();

    // 6. Return result to academy page
    if (stkData.ResponseCode === "0") {
      return new Response(
        JSON.stringify({
          success: true,
          checkoutRequestId: stkData.CheckoutRequestID,
          message: "STK Push sent successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(stkData.errorMessage || stkData.ResultDesc || "STK Push failed");
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});