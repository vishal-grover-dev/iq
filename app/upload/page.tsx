import UploadForm from "@/components/upload/uploadForm.component";

export default function UploadPage() {
  return (
    <div className='mx-auto w-full max-w-3xl px-4 py-8'>
      <h1 className='mb-6 text-2xl font-semibold tracking-tight'>Upload</h1>
      <UploadForm />
    </div>
  );
}
