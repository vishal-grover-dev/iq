import Link from "next/link";

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center'>
      <h2 className='text-2xl font-bold'>Not Found</h2>
      <p className='mt-2 text-gray-600 dark:text-gray-400'>Could not find requested resource</p>
      <Link href='/' className='mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'>
        Return Home
      </Link>
    </div>
  );
}
