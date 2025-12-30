import { defineComponent, Types } from 'bitecs';

export const AIBehavior = defineComponent({
  behaviorType: Types.ui8, // 0 = patrol, 1 = chase, 2 = flee
  targetEntity: Types.eid, // Entity ID of target
  detectionRadius: Types.f32,
  speed: Types.f32,
});
