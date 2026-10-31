import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const inputUser = String(username).trim();
    const inputPass = String(password);

    const db = await getDb();
    const users = db.collection("users");

    // Check if numeric for documents that might store id/password as numbers
    const idNum = Number(inputUser);
    const isIdNum = !isNaN(idNum) && inputUser !== "";
    const passNum = Number(inputPass);
    const isPassNum = !isNaN(passNum) && inputPass.trim() !== "";

    const userQuery = [
      { username: inputUser },
      { username: { $regex: new RegExp(`^${inputUser.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      { id: inputUser },
      { userId: inputUser },
      { email: inputUser }
    ];
    if (isIdNum) {
      userQuery.push({ id: idNum }, { userId: idNum });
    }

    const passQuery = [
      { password: inputPass },
      { password: inputPass.trim() }
    ];
    if (isPassNum) {
      passQuery.push({ password: passNum });
    }

    // Read-only lookup in the 'users' collection.
    // Strictly NO user creation, deletion, or modification in the app.
    const user = await users.findOne({
      $and: [
        { $or: userQuery },
        { $or: passQuery }
      ]
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const displayName = user.username || user.id || user.userId || user.email || inputUser;

    return NextResponse.json({
      ok: true,
      user: { username: displayName }
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
