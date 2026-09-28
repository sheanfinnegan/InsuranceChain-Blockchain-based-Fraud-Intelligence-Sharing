from pathlib import Path
import json, csv
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import subprocess
from pypdf import PdfReader

out = Path("output/pdf")
out.mkdir(parents=True, exist_ok=True)
examples = [
    (
        "Rawat inap ditagihkan pada dua penyedia",
        "Duplicate billing",
        "32",
        "Kota Bandung",
        "Nusantara",
        "Ardan Wicaksana",
        48500000,
        "Dua tagihan memuat tanggal rawat 12-15 September dan rincian tindakan yang identik. Konfirmasi jadwal menunjukkan hanya satu episode perawatan.",
        "APPROVED",
    ),
    (
        "Peningkatan kode tindakan tanpa dukungan laporan",
        "Upcoding",
        "31",
        "Jakarta Selatan",
        "Sentra",
        "Laras Prameswari",
        32750000,
        "Kode operasi mayor muncul pada rincian biaya. Catatan pelayanan hanya mencatat observasi dan tindakan rawat jalan. Perbedaan dikonfirmasi melalui rekonsiliasi berkas.",
        "APPROVED",
    ),
    (
        "Layanan fisioterapi pada jadwal yang tumpang tindih",
        "Phantom billing",
        "35",
        "Kota Surabaya",
        "Arunika",
        "Bagas Adinata",
        18400000,
        "Dua fasilitas mencatat sesi terapi pada jam yang sama selama empat hari. Log kehadiran salah satu fasilitas tidak mencatat kunjungan peserta.",
        "PENDING",
    ),
    (
        "Perubahan nominal pada kuitansi pemeriksaan",
        "Pemalsuan dokumen",
        "51",
        "Kota Denpasar",
        "Cakrawala",
        "Naya Kirana",
        12750000,
        "Salinan kuitansi menunjukkan nominal berbeda dari rekap kas fasilitas. Perbandingan menyoroti baris pemeriksaan laboratorium dan total pembayaran.",
        "APPROVED",
    ),
    (
        "Identitas peserta digunakan pada kunjungan berbeda",
        "Penyalahgunaan identitas",
        "73",
        "Kota Makassar",
        "Pradana",
        "Ardan Wicaksana",
        26800000,
        "Nama dan identitas yang sama muncul pada kunjungan di kota berbeda pada tanggal bersamaan. Tim menunggu konfirmasi dokumen kehadiran dari kedua fasilitas.",
        "PENDING",
    ),
    (
        "Paket layanan sudah tercakup ditagihkan terpisah",
        "Unbundling",
        "12",
        "Kota Medan",
        "Nusantara",
        "Dimas Abinaya",
        21900000,
        "Tindakan pemeriksaan dan administrasi dimasukkan kembali sebagai baris terpisah meskipun tercakup dalam paket rawat. Rekap biaya digunakan untuk rekonsiliasi.",
        "APPROVED",
    ),
    (
        "Dugaan duplikasi resep telah diklarifikasi",
        "Duplicate billing",
        "64",
        "Kota Balikpapan",
        "Sentra",
        "Sera Maheswari",
        8400000,
        "Dua transaksi obat terlihat identik pada pemeriksaan awal. Dokumen retur dan nota pengganti menunjukkan pembatalan transaksi pertama sehingga dugaan tidak didukung.",
        "REJECTED",
    ),
    (
        "Koreksi temuan biaya rawat setelah rekonsiliasi",
        "Upcoding",
        "34",
        "Kota Yogyakarta",
        "Arunika",
        "Raka Daniswara",
        35600000,
        "Perbedaan biaya rawat semula dinilai tidak sesuai. Surat koreksi fasilitas dan rincian layanan tambahan kemudian menjelaskan perubahan kelas perawatan.",
        "INVALID",
    ),
]
styles = getSampleStyleSheet()
styles["Title"].textColor = colors.HexColor("#34264f")
styles["BodyText"].leading = 16
manifest = []
for i, (
    title,
    kind,
    province,
    city,
    org,
    name,
    amount,
    description,
    status,
) in enumerate(examples):
    key = f"berkas-{i+1:02d}"
    nik = "000000000000" + f"{(1 if i==4 else i+1):04d}"
    path = out / f"{key}-laporan.pdf"
    story = [
        Paragraph("UNIT ANALISIS & REKONSILIASI", styles["Heading2"]),
        Paragraph(title, styles["Title"]),
        Spacer(1, 18),
    ]
    rows = [
        ["REFERENSI BERKAS", f"INV/IX/2026/{i+1:03d}"],
        ["PESERTA", name],
        ["LOKASI", city],
        ["PERIODE PEMERIKSAAN", "12 - 20 September 2026"],
        ["JENIS TEMUAN", kind],
        ["NILAI DITINJAU", "Rp " + f"{amount:,}".replace(",", ".")],
    ]
    table = Table(rows, colWidths=[155, 335])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eeebf2")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#ddd8e3")),
                ("PADDING", (0, 0), (-1, -1), 10),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story += [
        table,
        Spacer(1, 24),
        Paragraph("01 / RINGKASAN TEMUAN", styles["Heading2"]),
        Paragraph(description, styles["BodyText"]),
        Spacer(1, 20),
        Paragraph("02 / LANGKAH PEMERIKSAAN", styles["Heading2"]),
    ]
    for line in [
        "12 September: dokumen layanan diterima dan dicocokkan dengan rincian biaya.",
        "16 September: dilakukan perbandingan jadwal pelayanan dan rekap pembayaran.",
        "20 September: hasil rekonsiliasi disampaikan untuk penilaian lintas organisasi.",
    ]:
        story += [Paragraph(line, styles["BodyText"]), Spacer(1, 8)]
    story += [
        Spacer(1, 24),
        Paragraph(
            "LAMPIRAN: rincian rekonsiliasi CSV dan salinan visual lembar pemeriksaan.",
            styles["BodyText"],
        ),
    ]

    def footer(c, d):
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#77717e"))
        c.drawString(52, 35, f"InsuranceChain | Berkas pemeriksaan {i+1:03d}")
        c.drawRightString(542, 35, "1 / 1")

    SimpleDocTemplate(
        str(path), leftMargin=52, rightMargin=52, topMargin=45, bottomMargin=60
    ).build(story, onFirstPage=footer)
    assert len(PdfReader(path).pages) == 1
    image = out / f"{key}-lembar-pemeriksaan.png"
    subprocess.run(
        [
            "C:/Users/shean/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe",
            "-scale-to",
            "1200",
            "-singlefile",
            "-png",
            str(path),
            str(image.with_suffix("")),
        ],
        check=True,
    )
    csvpath = out / f"{key}-rekonsiliasi.csv"
    with csvpath.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["Tanggal", "Komponen", "Nilai tagihan", "Nilai terkonfirmasi", "Catatan"]
        )
        writer.writerows(
            [
                [
                    "2026-09-12",
                    "Layanan utama",
                    amount,
                    int(amount * 0.65),
                    "Perlu pencocokan dokumen",
                ],
                [
                    "2026-09-16",
                    "Penyesuaian",
                    0,
                    int(amount * 0.35),
                    "Menunggu hasil review",
                ],
            ]
        )
    manifest.append(
        dict(
            title=title,
            description=description
            + " Lampiran memuat laporan pemeriksaan, lembar visual, dan rincian rekonsiliasi.",
            fraudType=kind,
            provinceId=province,
            city=city,
            org=org.lower(),
            name=name,
            nik=nik,
            amount=amount,
            status=status,
            paths=[str(path), str(image), str(csvpath)],
        )
    )
Path("output/evidence-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(
    "Created 8 PDF reports, 8 PNG document previews, 8 CSV evidence files; all PDFs one page."
)
