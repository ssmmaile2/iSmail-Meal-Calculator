select
  sf.name_ar as source_food,
  tf.name_ar as target_food,
  r.rule_type,
  r.notes
from food_interaction_rules r
left join foods sf on sf.id = r.source_food_id
left join foods tf on tf.id = r.target_food_id
where sf.name_ar in ('لوز','فول سوداني')
   or tf.name_ar in ('لوز','فول سوداني');