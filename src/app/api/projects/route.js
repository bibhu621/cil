import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const col = async () => (await getDb()).collection("projects");
const fail = (err, status = 500) => NextResponse.json({ ok: false, error: err.message || err }, { status });
const oid = (id) => { if (!ObjectId.isValid(id)) throw new Error("Invalid _id"); return new ObjectId(id); };

export async function GET() {
  try {
    const projects = await (await col()).find({}).toArray();
    return NextResponse.json({ ok: true, projects });
  } catch (err) { return fail(err); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    delete body._id;
    const r = await (await col()).insertOne({ ...body, createdAt: new Date() });
    return NextResponse.json({ ok: true, id: r.insertedId });
  } catch (err) { return fail(err); }
}

export async function PUT(req) {
  try {
    const { _id, ...body } = await req.json();
    await (await col()).updateOne({ _id: oid(_id) }, { $set: { ...body, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) { return fail(err); }
}

export async function DELETE(req) {
  try {
    const { _id } = await req.json();
    await (await col()).deleteOne({ _id: oid(_id) });
    return NextResponse.json({ ok: true });
  } catch (err) { return fail(err); }
}