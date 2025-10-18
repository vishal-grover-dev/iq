import UploadForm from "@/components/upload/uploadForm.component";
import { UPLOAD_PAGE_LABELS } from "@/constants/upload.constants";

export default function UploadPage() {
  return (
    <div className='mx-auto w-full max-w-7xl px-4 py-8'>
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold tracking-tight'>{UPLOAD_PAGE_LABELS.TITLE}</h1>
        <p className='text-muted-foreground mt-1 text-sm'>{UPLOAD_PAGE_LABELS.DESCRIPTION}</p>
      </div>
      <UploadForm />
    </div>
  );
}
