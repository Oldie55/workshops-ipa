import { useRouter } from 'next/router';
import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../../hooks';
import { useFirebase } from '../../providers';
import { LoadingAnimation, ViewStatusPresenter, WorkshopPage } from '../../ui';

const VIEW_STATUS_MESSAGES = {
	waiting: 'Du wirst dem Workshop hinzugefügt',
	success:
		'Deine Teilnahme wurde bestätigt. Du hast ein Mail erhalten und der Workshop ist deinem Kalender hinzugefügt worden.',
	error: 'Beim Versuch deine Teilnahme zu registrieren ist ein Fehler unterlaufen.',
};

export default function WorkshopDetailsView() {
	const [status, setStatus] = useState<TViewStatus>('ACTIVE');
	const [workshop, setWorkshop] = useState<IWorkshop>();

	const router = useRouter();
	const { functions } = useFirebase();
	const { approved, session } = useAuth(true);

	const { id } = router.query;
	const workshopId = typeof id === 'string' ? id : null;

	useEffect(() => {
		if (!functions || workshop || !workshopId) return;
		functions
			.httpsCallable('getWorkshopById')({
				workshopId,
			})
			.then((res: { data: IFunctionsApi['getWorkshopByIdOutput'] }) => setWorkshop(res.data));
	}, [functions, workshop, workshopId]);

	if (!approved || !functions || !workshop) return <LoadingAnimation />;

	const addAttendeeToWorkshop = async () => {
		if (!workshopId || !session || !session.user.email) return;
		const params: IFunctionsApi['addWorkshopAttendeeParams'] = {
			workshopId,
			attendee: {
				email: session.user.email,
			},
		};
		setStatus('WAITING');
		functions
			.httpsCallable('addWorkshopAttendee')(params)
			.then((res: { data: IFunctionsApi['addWorkshopAttendeeOutput'] }) => {
				const { entryUpdated, eventUpdated } = res.data;
				if (entryUpdated && eventUpdated) return setStatus('SUCCESS');
				return setStatus('ERROR');
			})
			.catch(() => setStatus('ERROR'));
	};

	const redirectToWorkshopPlanningPage = async () => router.push('/workshop/new');

	return (
		<Fragment>
			<WorkshopPage
				workshop={workshop}
				addAttendeeToWorkshop={addAttendeeToWorkshop}
				redirectToWorkshopPlanningPage={redirectToWorkshopPlanningPage}
			/>
			<ViewStatusPresenter status={status} setStatus={setStatus} messages={VIEW_STATUS_MESSAGES} />
		</Fragment>
	);
}