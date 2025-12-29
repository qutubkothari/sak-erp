'use client';

import { useRouter } from 'next/navigation';

export default function JobOrdersPage() {
	const router = useRouter();

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
			<div className="max-w-7xl mx-auto">
				<div className="mb-8">
					<button
						onClick={() => router.push('/dashboard')}
						className="text-indigo-800 hover:text-indigo-900 mb-4 flex items-center gap-2"
					>
						← Back to Dashboard
					</button>
					<div className="flex justify-between items-center">
						<div>
							<h1 className="text-4xl font-bold text-indigo-900 mb-2">Job Orders</h1>
							<p className="text-indigo-600">Manage job orders (separate from Production Planning)</p>
						</div>
						<button
							onClick={() => router.push('/dashboard/production')}
							className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
						>
							Go to Production Planning
						</button>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-md p-8 text-gray-700">
					<p>
						This route is now dedicated to the new Job Orders module.
						If you tell me the exact API endpoints + fields/actions for Job Orders, I’ll wire the UI here.
					</p>
				</div>
			</div>
		</div>
	);
}
