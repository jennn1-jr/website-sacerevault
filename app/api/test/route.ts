import clientPromise from "@/src/lib/mongodb";

export async function GET() {
    try {
        // Menggunakan clientPromise dari mongodb.ts
        const client = await clientPromise;

        // Memilih database
        const db = client.db("sacarevault");

        // Tes ambil data dari koleksi test
        const data = await db.collection("test").find({}).toArray();

        return Response.json({
            success: true,
            message: "Berhasil terhubung menggunakan clientPromise!",
            data,
        });
    } catch (error: any) {
        return Response.json({
            success: false,
            error: error.message,
        });
    }
}