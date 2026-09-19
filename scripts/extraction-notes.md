# Audit de l’extraction

L’inventaire indépendant des titres du XHTML donne **124 notions indexées** :
115 issues des titres principaux (dont les différentes notions des articles
communs) et 9 sous-entrées. Cet inventaire correspond au JSON généré : aucun
titre attendu manquant et aucun titre ajouté hors de ce périmètre.

Le périmètre comprend les titres contenant un mot en `-isme`, y compris
les formes qualifiées, telles que « matérialisme historique ». Il ne comprend
pas tous les mots en `-isme` mentionnés dans le corps du livre.

## Exemples signalés

- **Anthropomorphisme**, p. 24 : titre original coupé « anthropo- / morphisme ».
  L’ancien script produisait la fausse entrée « morphisme ». Correction identique
  pour anthropocentrisme (p. 23) et conventionnalisme (p. 102–103).
- **Réductionnisme** : aucun titre ni occurrence de ce substantif dans le texte
  XHTML examiné après réunion des lignes. L’article Searle mentionne les
  « conceptions réductionnistes » p. 454. Aucune définition n’a été inventée.

## Autres corrections

- Reconnaissance des variantes de police des titres, dont zoroastrisme p. 540.
- Indexation des sous-entrées : égocentrisme, nationalisme, atomisme logique,
  fonctionnalisme épistémologique, idéalisme transcendantal, marxisme-léninisme,
  matérialisme dialectique, matérialisme historique et principe du déterminisme.
- Articles communs : spécisme/antispécisme et transhumanisme/posthumanisme.
  Leur titre commun est affiché pour ne pas attribuer tout l’article à une
  seule des notions. Libéralisme conserve également son titre source commun.
- Les en-têtes courants sont éliminés selon leur position dans la page.
  Celui de la p. 425 interrompait la définition du relativisme et polluait
  ses renvois. La suite de la p. 426 est maintenant conservée.
- Les titres en italique arrêtent correctement l’entrée précédente.
- Les variantes typographiques des renvois sont prises en compte.
- Les chiffres romains et les exposants des siècles sont conservés.
- Les sous-titres des développements sont conservés dans `contextBlocks`.
- Les tables finales ne sont pas absorbées dans la dernière entrée.
- Un doublon d’identifiant interrompt l’extraction au lieu d’écraser une entrée.

## Cohérence et limites

54 notions comportent des termes explicitement opposés dans le livre,
soit 97 mentions. Les antonymes ne sont ni inventés, ni rendus artificiellement
réciproques. Les listes finales du parent ne sont pas attribuées aux sous-entrées.

Décisionnisme et occasionnalisme sont des renvois sans définition autonome
à cet endroit du livre ; l’interface les présente comme tels.

La complétude vérifiée porte sur l’index des titres, pas sur une certification
mot à mot de l’ouvrage. La reconstruction des paragraphes, les césures et le
décodage des polices restent propres à cet export fixe. Des espacements autour
des ligatures ou des mots composés peuvent encore nécessiter une relecture.
La source de chaque entrée indique son titre, sa page de début et de fin,
et son article parent pour les sous-entrées.

Aucune suite de tests n’a été ajoutée. L’audit consiste en une comparaison du
contenu avec les fichiers source et une compilation de l’application.
