import UploadForm from "@/components/upload/uploadForm.component";

export default function UploadPage() {
  return (
    <div className='mx-auto w-full max-w-7xl px-4 py-8'>
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold tracking-tight'>Ingest Sources</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Add documentation sources for interview streams or upload academic PDFs.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
