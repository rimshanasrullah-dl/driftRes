import express from "express";
const PORT = process.env.PORT || 3000;
const app = express();

const restaurants = [
  { id: 1, name: "Bundu Khan", city: "Lahore" },
  { id: 2, name: "Cafe Aylanto", city: "Lahore" },
  { id: 3, name: "Monal", city: "Islamabad" },
];

function logger(req, res, next) {
  const time = new Date().toISOString();
  console.log(`Logger:[${time}] ${req.method} ${req.url}`);
  next();
}

app.use(logger);
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Welcome to our app",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/restaurants", (req, res) => {
  res.status(200).json({
    status: "okk",
    data: restaurants,
  });
});

app.get("/restaurants/:id", (req, res) => {
  const id = req.params.id;
  const result = restaurants.filter((r) => r.id == id);
  if (result.length == 0) {
    return res.status(404).json({ error: "Restaurant not found" });
  }
  res.status(200).json({
    status: "okk",
    data: result,
  });
});

app.post("/restaurants", (req, res) => {
  const { name, city } = req.body;

  if (!name || !city) {
    return res.status(400).json({ error: "name and city are required" });
  }

  const newRes = { id: restaurants.length + 1, name, city };
  restaurants.push(newRes);

  res.status(201).json({ status: "ok", message: "New resturant added" });
});

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
  console.log("server running at port ", PORT);
});
