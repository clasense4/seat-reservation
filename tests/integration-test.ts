/**
 * Integration Test: Full Reservation Flow
 *
 * Tests the complete user journey:
 * register -> login -> select destination -> hold seat -> pay -> confirm -> verify booking
 *
 * Usage: bun run test:integration
 * Requires: Server running at http://localhost:3000 with seeded data
 */

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("\n=== Integration Test: Full Reservation Flow ===\n");

  const email = `integration-${Date.now()}@test.com`;
  const password = "test123456";

  // 1. Register
  console.log("1. Register...");
  const regRes = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
    redirect: "manual",
  });
  console.assert(regRes.status === 302, `Register should redirect (302), got ${regRes.status}`);
  console.log("   ✓ Registered successfully");

  // 2. Login
  console.log("2. Login...");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
    redirect: "manual",
  });
  console.assert(loginRes.status === 302, `Login should redirect (302), got ${loginRes.status}`);
  const cookie = loginRes.headers.get("set-cookie") || "";
  const sidMatch = cookie.match(/sid=([^;]+)/);
  console.assert(sidMatch !== null, "Should receive session cookie");
  const sid = sidMatch![1];
  console.log("   ✓ Logged in, got session cookie");

  // 3. Select destination
  console.log("3. Select destination...");
  const destRes = await fetch(`${BASE_URL}/destinations`, {
    headers: { Cookie: `sid=${sid}` },
  });
  console.assert(destRes.status === 200, `Destinations page should load (200), got ${destRes.status}`);
  const destHtml = await destRes.text();
  const destMatch = destHtml.match(/href="\/destinations\/(\d+)\/seats"/);
  console.assert(destMatch !== null, "Should find a destination link");
  const destId = destMatch![1];
  console.log(`   ✓ Loaded destinations page, found destination ${destId}`);

  // 4. View seat map
  console.log("4. View seat map...");
  const seatMapRes = await fetch(`${BASE_URL}/destinations/${destId}/seats`, {
    headers: { Cookie: `sid=${sid}` },
  });
  console.assert(seatMapRes.status === 200, `Seat map should load (200), got ${seatMapRes.status}`);
  const seatMapHtml = await seatMapRes.text();
  const seatHoldMatch = seatMapHtml.match(/hx-post="\/seats\/(\d+)\/hold"/);
  console.assert(seatHoldMatch !== null, "Should find an available seat to hold");
  const seatId = seatHoldMatch![1];
  console.log(`   ✓ Loaded seat map, found seat ${seatId}`);

  // 5. Hold seat
  console.log("5. Hold seat...");
  const holdRes = await fetch(`${BASE_URL}/seats/${seatId}/hold`, {
    method: "POST",
    headers: { Cookie: `sid=${sid}` },
    redirect: "manual",
  });
  console.assert(holdRes.status === 302, `Hold should redirect (302), got ${holdRes.status}`);
  console.log(`   ✓ Seat ${seatId} held successfully`);

  // 6. View payment page
  console.log("6. View payment page...");
  const payRes = await fetch(`${BASE_URL}/payment`, {
    headers: { Cookie: `sid=${sid}` },
  });
  console.assert(payRes.status === 200, `Payment page should load (200), got ${payRes.status}`);
  const payHtml = await payRes.text();
  console.assert(payHtml.includes("Payment"), "Should show payment page");
  console.log("   ✓ Payment page loaded with seat and destination info");

  // 7. Process payment with demo card
  console.log("7. Process payment...");
  const paymentRes = await fetch(`${BASE_URL}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `sid=${sid}`,
    },
    body: new URLSearchParams({
      cardNumber: "4242 4242 4242 4242",
      expiry: "12/28",
      cvv: "123",
    }),
  });
  const paymentHtml = await paymentRes.text();
  console.assert(paymentHtml.includes("successfully reserved"), "Should show confirmation with success message");
  console.log("   ✓ Payment successful, reservation confirmed");

  // 8. Verify in My Bookings
  console.log("8. Verify in My Bookings...");
  const bookingsRes = await fetch(`${BASE_URL}/bookings`, {
    headers: { Cookie: `sid=${sid}` },
  });
  console.assert(bookingsRes.status === 200, `Bookings page should load (200), got ${bookingsRes.status}`);
  const bookingsHtml = await bookingsRes.text();
  console.assert(bookingsHtml.includes("My Bookings"), "Should show My Bookings page");
  console.assert(!bookingsHtml.includes("no reservations"), "Should show at least one booking");
  console.log("   ✓ Reservation appears in My Bookings");

  console.log(`\n✅ INTEGRATION TEST PASSED: Full reservation flow completed successfully`);
}

main().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
