import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secure_admin_session",
    resave: false,
    saveUninitialized: false
  })
);

app.use(express.static("public"));

/* --------- AUTH --------- */
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) next();
  else res.redirect("/login.html");
}

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    res.redirect("/admin.html");
  } else {
    res.send("Invalid credentials");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.resolve("public/admin.html"));
});

/* --------- ORDERS --------- */
const ORDERS_FILE = "orders.json";

function saveOrder(order) {
  const orders = fs.existsSync(ORDERS_FILE)
    ? JSON.parse(fs.readFileSync(ORDERS_FILE))
    : [];
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

app.post("/create-order", (req, res) => {
  const total = req.body.cart.reduce((s, i) => s + i.price * i.qty, 0);
  res.json({ id: Date.now(), total });
});

app.post("/capture-order/:id", (req, res) => {
  saveOrder({
    orderId: req.params.id,
    amount: req.body.amount || 0,
    status: "COMPLETED",
    date: new Date().toISOString()
  });
  res.json({ success: true });
});

app.get("/api/orders", requireAdmin, (req, res) => {
  if (!fs.existsSync(ORDERS_FILE)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(ORDERS_FILE)));
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
