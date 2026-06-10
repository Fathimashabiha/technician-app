import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export type ExecutionReturnScreen = 'WorkOrderDetails' | 'PpmExecutionDetails';

export type ExecutionRouteParams = {
  returnTo?: ExecutionReturnScreen;
  scheduleId?: string;
};

export function getReturnScreen(params?: { returnTo?: string }): ExecutionReturnScreen {
  return params?.returnTo === 'PpmExecutionDetails' ? 'PpmExecutionDetails' : 'WorkOrderDetails';
}

export function navigateAfterStep(
  navigation: NavigationProp<ParamListBase>,
  routeParams: { returnTo?: string; id: string; scheduleId?: string },
  completion: Record<string, unknown>
) {
  const screen = getReturnScreen(routeParams);
  if (screen === 'PpmExecutionDetails') {
    navigation.navigate('PpmExecutionDetails' as never, {
      scheduleId: routeParams.scheduleId ?? routeParams.id,
      ...completion,
    } as never);
    return;
  }
  navigation.navigate('WorkOrderDetails' as never, {
    id: routeParams.id,
    ...completion,
  } as never);
}

export function ppmStepNavParams(scheduleId: string) {
  return {
    id: scheduleId,
    scheduleId,
    returnTo: 'PpmExecutionDetails' as const,
  };
}
